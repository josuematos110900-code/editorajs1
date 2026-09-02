// Publicada no Supabase em: Edge Functions > cakto-webhook
// Requer o secret CAKTO_WEBHOOK_SECRET definido em Edge Functions >
// cakto-webhook > Secrets — tem de ser EXATAMENTE igual ao campo "Chave
// secreta" configurado no webhook do produto na Cakto.
//
// FASE 3 — Billing Engine: este webhook é a única porta de entrada para
// ativar/renovar/cancelar Premium a partir da Cakto. Segue estas regras:
//   1. IDEMPOTÊNCIA: cada (provider, event_id) só é processado uma vez —
//      garantido pela constraint UNIQUE(provider, event_id) em
//      billing_events (supabase/migrations/002_security_hardening.sql).
//      Um INSERT nessa tabela funciona como lock atómico: sob pedidos
//      concorrentes com o mesmo event_id, o Postgres só deixa um deles
//      ganhar — o outro recebe 23505 (unique_violation) e é ignorado.
//   2. Nunca cria uma segunda linha em "subscriptions" — a tabela tem
//      UNIQUE(user_id), por isso upsert(onConflict: 'user_id') sempre
//      atualiza a mesma assinatura, nunca duplica.
//   3. Cancelamento não retira Premium imediatamente: só marca
//      status=canceled e deixa current_period_end como está — quem
//      decide se o utilizador ainda tem acesso é has_active_premium()
//      (supabase/migrations/002_security_hardening.sql), que continua
//      a contar "canceled" como Premium até essa data. A transição para
//      "free" depois de expirar acontece no cron expire_subscriptions()
//      (supabase/migrations/003_billing_engine.sql), tal como já
//      acontece com os trials em expire_trials().
//
// ⚠️ Nomes de campos do payload da Cakto: os nomes usados abaixo
// (event, data.customer.email, data.customer.id, data.product.id,
// data.product.type, data.subscription.id, data.subscription.
// next_payment_date, data.id) refletem a integração já existente neste
// projeto. Este ambiente de execução não tem acesso à internet para
// confirmar contra a documentação da Cakto ao vivo — antes de ligar isto
// a tráfego real, confirma estes nomes contra um payload de teste real
// enviado pela Cakto (Painel Cakto > Produto > Webhooks > Testar) e
// ajusta `resolveEventId`/os campos lidos se algum nome for diferente.
// Nunca inventes um endpoint, header ou evento que não estejam
// documentados ou já usados aqui.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CAKTO_WEBHOOK_SECRET = Deno.env.get("CAKTO_WEBHOOK_SECRET");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Eventos que significam "o utilizador tem/continua a ter Premium ativo"
const PURCHASE_EVENTS = new Set(["purchase_approved", "subscription_created"]);
const RENEWAL_EVENTS = new Set(["subscription_renewed"]);

// Eventos que significam "o utilizador deixou (ou vai deixar) de ter Premium"
const CANCEL_EVENTS = new Set(["subscription_canceled"]);
const PAST_DUE_EVENTS = new Set(["subscription_renewal_refused", "payment_refused", "payment_declined"]);
const REFUND_EVENTS = new Set(["refund", "purchase_refunded"]);
const CHARGEBACK_EVENTS = new Set(["chargeback"]);

function jsonSafeStringify(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value ?? {}));
  } catch {
    return {};
  }
}

/**
 * Chave de idempotência do evento. Tenta os campos mais prováveis de
 * identificar unicamente este webhook (ver aviso no topo do ficheiro).
 * Nunca cai para um valor aleatório: se não encontrar nada estável,
 * combina evento + assinatura/cliente + timestamp — na pior hipótese
 * dois envios "gémeos" no mesmo segundo seriam tratados como o mesmo
 * evento, o que é mais seguro do que arriscar duplicar uma renovação.
 */
function resolveEventId(body: any): string {
  const data = body?.data ?? {};
  const candidate =
    body?.id ??
    data?.id ??
    data?.transaction_id ??
    data?.subscription?.id ??
    null;
  if (candidate) return String(candidate);

  const fallbackParts = [
    body?.event,
    data?.customer?.email,
    data?.subscription?.id,
    data?.created_at ?? data?.date ?? "",
  ];
  return fallbackParts.filter(Boolean).join(":") || `unknown:${Date.now()}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!CAKTO_WEBHOOK_SECRET) {
    console.error("CAKTO_WEBHOOK_SECRET não está configurado nos secrets desta função.");
    return new Response("Webhook não configurado", { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Validação de segurança: só aceita pedidos que tragam o segredo certo.
  if (body?.secret !== CAKTO_WEBHOOK_SECRET) {
    console.error("Webhook Cakto: segredo inválido, pedido ignorado.");
    return new Response("Unauthorized", { status: 401 });
  }

  const event = body.event as string | undefined;
  const data = body.data ?? {};
  const email: string | undefined = data.customer?.email;
  const productType: string | undefined = data.product?.type;

  if (!event) {
    console.log("Webhook Cakto recebido sem campo 'event' — ignorado.");
    return new Response("OK (sem evento)", { status: 200 });
  }

  console.log(`Webhook received: provider=cakto event=${event} email=${email ?? "-"} productType=${productType ?? "-"}`);

  // Só processamos produtos de assinatura — se um dia venderes algo
  // avulso na Cakto, este webhook ignora-o sem rebentar.
  if (productType && productType !== "subscription") {
    return new Response("OK (produto não é assinatura, ignorado)", { status: 200 });
  }

  const eventId = resolveEventId(body);

  // --- IDEMPOTÊNCIA -----------------------------------------------------
  // O INSERT abaixo é o ponto de decisão: a constraint UNIQUE(provider,
  // event_id) garante que, mesmo com dois pedidos a chegar ao mesmo
  // tempo (retry da Cakto + entrega original, por exemplo), só um deles
  // consegue inserir a linha. O outro falha aqui e sai já, sem tocar em
  // "subscriptions" nem enviar emails outra vez.
  const { data: insertedEvent, error: insertError } = await supabaseAdmin
    .from("billing_events")
    .insert({
      provider: "cakto",
      event_id: eventId,
      event_type: event,
      payload: jsonSafeStringify(body),
      processed: false,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      console.log(`Duplicate event ignored: provider=cakto event_id=${eventId} event=${event}`);
      return new Response("OK (evento duplicado, ignorado)", { status: 200 });
    }
    console.error("Erro ao registar billing_event:", insertError);
    return new Response("Erro interno", { status: 500 });
  }

  console.log(`Event validated: provider=cakto event_id=${eventId} event=${event}`);
  const billingEventId = insertedEvent.id as string;

  // Melhor esforço: a Cakto normalmente inclui o valor cobrado em
  // data.amount ou data.baseAmount — guardamos o que vier para dar
  // suporte ao histórico de faturação (Fase 11). Se nenhum vier, fica
  // null e o histórico simplesmente não mostra valor para essa linha,
  // nunca inventa um número.
  const amount: number | null =
    typeof data.amount === "number" ? data.amount : typeof data.baseAmount === "number" ? data.baseAmount : null;

  const markProcessed = async (userId: string | null, statusCode: string) => {
    await supabaseAdmin
      .from("billing_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        user_id: userId,
        amount,
        currency: "BRL",
        status: statusCode,
      })
      .eq("id", billingEventId);
  };

  if (!email) {
    console.warn(`Webhook Cakto event=${event} sem email de cliente — evento registado mas ignorado.`);
    await markProcessed(null, "ignored");
    return new Response("OK (sem email de cliente, ignorado)", { status: 200 });
  }

  const { data: userId, error: userError } = await supabaseAdmin.rpc(
    "get_user_id_by_email",
    { user_email: email }
  );

  if (userError) {
    console.error("Erro ao procurar utilizador:", userError);
    return new Response("Erro interno", { status: 500 });
  }

  if (!userId) {
    console.warn(`Nenhum utilizador FinançasPro encontrado para o email: ${email}`);
    await markProcessed(null, "user_not_found");
    return new Response("OK (utilizador não encontrado)", { status: 200 });
  }

  // Assinatura atual do utilizador, para atualizações parciais (ex: uma
  // renovação não deve apagar provider_customer_id já guardado se este
  // evento não o trouxer).
  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const providerCustomerId: string | null = data.customer?.id ?? existingSub?.provider_customer_id ?? null;
  const providerSubscriptionId: string | null = data.subscription?.id ?? existingSub?.provider_subscription_id ?? null;
  const providerProductId: string | null = data.product?.id ?? existingSub?.provider_product_id ?? null;
  const nextPaymentDate: string | null = data.subscription?.next_payment_date ?? null;
  const currentPeriodEnd = nextPaymentDate ? nextPaymentDate.slice(0, 10) : existingSub?.current_period_end ?? null;

  let outcome = "no-op";
  let statusCode = "ignored";

  if (PURCHASE_EVENTS.has(event)) {
    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: "premium",
        status: "active",
        country: "BR",
        currency: "BRL",
        billing_provider: "cakto",
        provider_customer_id: providerCustomerId,
        provider_subscription_id: providerSubscriptionId,
        provider_product_id: providerProductId,
        current_period_start: new Date().toISOString().slice(0, 10),
        current_period_end: currentPeriodEnd,
        auto_renew: true,
        canceled_at: null,
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("Erro ao ativar Premium:", error);
      return new Response("Erro interno", { status: 500 });
    }
    outcome = "Premium activated";
    statusCode = "succeeded";
  } else if (RENEWAL_EVENTS.has(event)) {
    // Renovação: mantém Premium, só avança o período. NÃO cria uma
    // segunda subscription (upsert por user_id) e não duplica faturação
    // — este bloco só corre uma vez por event_id graças à idempotência acima.
    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: "premium",
        status: "active",
        country: "BR",
        currency: "BRL",
        billing_provider: "cakto",
        provider_customer_id: providerCustomerId,
        provider_subscription_id: providerSubscriptionId,
        provider_product_id: providerProductId,
        current_period_start: existingSub?.current_period_end ?? new Date().toISOString().slice(0, 10),
        current_period_end: currentPeriodEnd,
        auto_renew: true,
        canceled_at: null,
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("Erro ao renovar Premium:", error);
      return new Response("Erro interno", { status: 500 });
    }
    outcome = "Subscription updated (renewed)";
    statusCode = "succeeded";
  } else if (CANCEL_EVENTS.has(event)) {
    // Cancelamento: NÃO retira o Premium já pago — só marca canceled.
    // has_active_premium() continua a devolver true até current_period_end.
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({ status: "canceled", auto_renew: false, canceled_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (error) {
      console.error("Erro ao cancelar subscrição:", error);
      return new Response("Erro interno", { status: 500 });
    }
    outcome = "Subscription canceled (Premium mantido até ao fim do período)";
    statusCode = "canceled";
  } else if (PAST_DUE_EVENTS.has(event)) {
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({ status: "past_due" })
      .eq("user_id", userId);
    if (error) {
      console.error("Erro ao marcar past_due:", error);
      return new Response("Erro interno", { status: 500 });
    }
    outcome = "Subscription marked past_due";
    statusCode = "failed";
  } else if (REFUND_EVENTS.has(event) || CHARGEBACK_EVENTS.has(event)) {
    // Reembolso/chargeback: revoga o acesso Premium imediatamente
    // (diferente de um cancelamento normal, que deixa correr até ao
    // fim do período já pago).
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        plan: "free",
        status: "expired",
        current_period_end: new Date().toISOString().slice(0, 10),
        auto_renew: false,
        canceled_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) {
      console.error(`Erro ao processar ${event}:`, error);
      return new Response("Erro interno", { status: 500 });
    }
    outcome = CHARGEBACK_EVENTS.has(event) ? "Chargeback processed — Premium revoked" : "Refund processed — Premium revoked";
    statusCode = CHARGEBACK_EVENTS.has(event) ? "chargeback" : "refunded";
  } else {
    console.log(`Evento ${event} recebido mas não requer ação.`);
  }

  await markProcessed(userId, statusCode);
  console.log(`${outcome} — user_id=${userId} event=${event} event_id=${eventId}`);

  return new Response("OK", { status: 200 });
});
