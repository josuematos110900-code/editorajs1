// Publicada no Supabase em: Edge Functions > vanqir-webhook
// Requer o secret VANQIR_WEBHOOK_HOTTOK definido em Edge Functions >
// vanqir-webhook > Secrets — tem de ser EXATAMENTE o "Hottok de
// verificação" mostrado em app.vanqir.com > Ferramentas > Webhook API >
// Autenticação (único por conta, reutilizável em todos os produtos).
//
// FASE 3 — Billing Engine (Angola/Vanqir). Segue as mesmas regras do
// cakto-webhook (ver esse ficheiro para o comentário completo):
//   1. IDEMPOTÊNCIA garantida por UNIQUE(provider, event_id) em
//      billing_events — aqui event_id é o header X-Vanqir-Delivery,
//      que a própria documentação do Vanqir diz para usar como
//      deduplicação (o Vanqir tenta entregar até 3 vezes o mesmo
//      delivery_id em caso de falha/timeout do nosso lado).
//   2. Nunca cria uma segunda linha em "subscriptions" (upsert por
//      user_id, que é UNIQUE).
//   3. O Vanqir em Angola é pagamento ÚNICO de 30 dias, sem renovação
//      automática (auto_renew=false) — diferente da Cakto no Brasil,
//      que é assinatura recorrente. Cada "order.paid" é um novo
//      pagamento de 30 dias; se ainda houver período por gastar,
//      estende a partir do fim desse período em vez de a partir de
//      hoje (para não "perder" dias já pagos numa renovação antecipada).
//
// Payload, headers e algoritmo de assinatura conforme a documentação
// oficial do Vanqir (app.vanqir.com > Ferramentas > Webhook API > Ver
// Documentação, consultada em 2026-09-03) — nada aqui foi inventado.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VANQIR_WEBHOOK_HOTTOK = Deno.env.get("VANQIR_WEBHOOK_HOTTOK");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Eventos ligados a um pagamento de cliente (têm data.order.buyer.email).
const PAYMENT_CONFIRMED_EVENTS = new Set(["order.paid"]);
const REFUND_EVENTS = new Set(["order.refunded"]);

// Eventos de conta / do produto no marketplace do Vanqir — não dizem
// respeito a um pagamento de um cliente específico, por isso só ficam
// registados em billing_events para auditoria, sem tocar em nenhuma
// subscription.
const ACCOUNT_LEVEL_EVENTS = new Set([
  "product.approved",
  "product.rejected",
  "withdrawal.approved",
  "withdrawal.paid",
  "kyc.approved",
  "kyc.rejected",
  "webhook.test",
]);

const PREMIUM_PERIOD_DAYS = 30;

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifica o header X-Vanqir-Signature: "t=<timestamp_unix>,v1=<hash>".
 * Reconstrói "${t}.${rawBody}" (corpo tal como recebido, sem
 * reserializar) e compara o HMAC-SHA256 calculado com hottok em tempo
 * constante — exatamente como documentado pelo Vanqir.
 */
async function verifySignature(signatureHeader: string | null, rawBody: string, hottok: string): Promise<boolean> {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    })
  );
  const timestamp = parts["t"];
  const received = parts["v1"];
  if (!timestamp || !received) return false;

  const expected = await hmacSha256Hex(hottok, `${timestamp}.${rawBody}`);
  return timingSafeEqualHex(expected, received);
}

function jsonSafeStringify(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value ?? {}));
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!VANQIR_WEBHOOK_HOTTOK) {
    console.error("VANQIR_WEBHOOK_HOTTOK não está configurado nos secrets desta função.");
    return new Response("Webhook não configurado", { status: 500 });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("X-Vanqir-Signature");
  const event = req.headers.get("X-Vanqir-Event");
  const deliveryId = req.headers.get("X-Vanqir-Delivery");
  const attempt = req.headers.get("X-Vanqir-Attempt");

  const validSignature = await verifySignature(signatureHeader, rawBody, VANQIR_WEBHOOK_HOTTOK);
  if (!validSignature) {
    console.error("Webhook Vanqir: assinatura inválida, pedido ignorado.");
    return new Response("Unauthorized", { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!event || !deliveryId) {
    console.log("Webhook Vanqir recebido sem X-Vanqir-Event/X-Vanqir-Delivery — ignorado.");
    return new Response("OK (headers em falta)", { status: 200 });
  }

  console.log(`Webhook received: provider=vanqir event=${event} delivery=${deliveryId} attempt=${attempt ?? "-"}`);

  const data = body?.data ?? {};

  // --- IDEMPOTÊNCIA -----------------------------------------------------
  // X-Vanqir-Delivery é o mesmo em todas as tentativas de reenvio do
  // mesmo evento (o Vanqir tenta até 3 vezes) — por isso é a chave
  // certa para o UNIQUE(provider, event_id). O INSERT funciona como
  // lock atómico: só a primeira tentativa (ou o primeiro de dois
  // pedidos concorrentes) consegue inserir a linha.
  const { data: insertedEvent, error: insertError } = await supabaseAdmin
    .from("billing_events")
    .insert({
      provider: "vanqir",
      event_id: deliveryId,
      event_type: event,
      payload: jsonSafeStringify(body),
      processed: false,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      console.log(`Duplicate event ignored: provider=vanqir event_id=${deliveryId} event=${event}`);
      return new Response("OK (evento duplicado, ignorado)", { status: 200 });
    }
    console.error("Erro ao registar billing_event:", insertError);
    return new Response("Erro interno", { status: 500 });
  }

  console.log(`Event validated: provider=vanqir event_id=${deliveryId} event=${event}`);
  const billingEventId = insertedEvent.id as string;

  const amountCents: number | null =
    typeof data.order_amount_cents === "number"
      ? data.order_amount_cents
      : typeof data.order?.amount_cents === "number"
        ? data.order.amount_cents
        : null;
  const amount = amountCents != null ? amountCents / 100 : null;
  const currency: string = typeof data.currency === "string" ? data.currency : "AOA";
  const productId: string | null = data.product_id ?? null;

  const markProcessed = async (userId: string | null, statusCode: string) => {
    await supabaseAdmin
      .from("billing_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        user_id: userId,
        amount,
        currency,
        status: statusCode,
      })
      .eq("id", billingEventId);
  };

  if (ACCOUNT_LEVEL_EVENTS.has(event)) {
    // Eventos de conta/produto no marketplace — não têm cliente
    // associado, só ficam registados para auditoria.
    await markProcessed(null, "ignored");
    console.log(`Evento de conta ${event} registado, sem ação sobre subscriptions.`);
    return new Response("OK", { status: 200 });
  }

  const email: string | undefined = data.order?.buyer?.email;
  if (!email) {
    console.warn(`Webhook Vanqir event=${event} sem email de comprador — evento registado mas ignorado.`);
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

  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let outcome = "no-op";
  let statusCode = "ignored";

  if (PAYMENT_CONFIRMED_EVENTS.has(event)) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Se ainda houver período pago por gastar (ex: renovou antes do fim
    // dos 30 dias anteriores), estende a partir daí em vez de a partir
    // de hoje — nunca "perde" dias já pagos.
    const existingEnd = existingSub?.current_period_end;
    const startFrom = existingEnd && existingEnd > todayStr ? new Date(existingEnd) : today;
    const periodEnd = new Date(startFrom);
    periodEnd.setDate(periodEnd.getDate() + PREMIUM_PERIOD_DAYS);

    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: "premium",
        status: "active",
        country: "AO",
        currency: "AOA",
        billing_provider: "vanqir",
        provider_product_id: productId,
        current_period_start: todayStr,
        current_period_end: periodEnd.toISOString().slice(0, 10),
        // Pagamento único, sem renovação automática — o utilizador tem
        // de voltar a pagar no Vanqir quando o período acabar.
        auto_renew: false,
        canceled_at: null,
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("Erro ao ativar Premium (Vanqir):", error);
      return new Response("Erro interno", { status: 500 });
    }
    outcome = "Premium activated (Vanqir, 30 dias)";
    statusCode = "succeeded";
  } else if (REFUND_EVENTS.has(event)) {
    // Reembolso: revoga o acesso Premium imediatamente.
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
      console.error("Erro ao processar reembolso (Vanqir):", error);
      return new Response("Erro interno", { status: 500 });
    }
    outcome = "Refund processed (Vanqir) — Premium revoked";
    statusCode = "refunded";
  } else {
    console.log(`Evento ${event} recebido mas não requer ação.`);
  }

  await markProcessed(userId, statusCode);
  console.log(`${outcome} — user_id=${userId} event=${event} delivery=${deliveryId}`);

  return new Response("OK", { status: 200 });
});
