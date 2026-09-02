// Publicada no Supabase em: Edge Functions > cakto-webhook
// Requer o secret CAKTO_WEBHOOK_SECRET definido em Edge Functions >
// cakto-webhook > Secrets — tem de ser EXATAMENTE igual ao campo "Chave
// secreta" configurado no webhook do produto na Cakto.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CAKTO_WEBHOOK_SECRET = Deno.env.get("CAKTO_WEBHOOK_SECRET");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Eventos que significam "o utilizador tem/continua a ter Premium ativo"
const PREMIUM_EVENTS = new Set([
  "purchase_approved",
  "subscription_created",
  "subscription_renewed",
]);

// Eventos que significam "o utilizador deixou de ter Premium"
const DOWNGRADE_EVENTS = new Set([
  "subscription_canceled",
  "subscription_renewal_refused",
  "chargeback",
  "refund",
]);

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

  console.log(`Webhook Cakto recebido: event=${event} email=${email} productType=${productType}`);

  if (!event) {
    return new Response("OK (sem evento)", { status: 200 });
  }

  // Só processamos produtos de assinatura — se um dia venderes algo
  // avulso na Cakto, este webhook ignora-o sem rebentar.
  if (productType && productType !== "subscription") {
    return new Response("OK (produto não é assinatura, ignorado)", { status: 200 });
  }

  if (!email) {
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
    return new Response("OK (utilizador não encontrado)", { status: 200 });
  }

  if (PREMIUM_EVENTS.has(event)) {
    const nextPaymentDate: string | null = data.subscription?.next_payment_date ?? null;
    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: "premium",
        status: "active",
        billing_provider: "cakto",
        auto_renew: true,
        current_period_end: nextPaymentDate ? nextPaymentDate.slice(0, 10) : null,
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("Erro ao ativar Premium:", error);
      return new Response("Erro interno", { status: 500 });
    }
    console.log(`Premium ativado para user_id=${userId}`);
  } else if (DOWNGRADE_EVENTS.has(event)) {
    const status = event === "subscription_renewal_refused" ? "past_due" : "canceled";
    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      { user_id: userId, plan: "free", status },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("Erro ao desativar Premium:", error);
      return new Response("Erro interno", { status: 500 });
    }
    console.log(`Premium desativado para user_id=${userId} (status=${status})`);
  } else {
    console.log(`Evento ${event} recebido mas não requer ação.`);
  }

  return new Response("OK", { status: 200 });
});
