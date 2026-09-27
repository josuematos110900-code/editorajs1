// Edge Function: payment-webhook
//
// Recebe as notificações do provedor de pagamentos e atualiza a encomenda.
// Secrets (Supabase > Edge Functions > payment-webhook > Secrets):
//   PAYMENT_WEBHOOK_SECRET  — segredo partilhado com o provedor (HMAC)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — injetados pelo Supabase
//
// Publicar SEM verificação de JWT (o provedor não tem sessão Supabase):
//   supabase functions deploy payment-webhook --no-verify-jwt
// A autenticação do pedido é a assinatura HMAC, verificada antes de tudo.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verifyWebhookSignature } from '../_shared/signature.ts';
import { normalizePaymentEvent } from '../_shared/paymentEvent.ts';

const WEBHOOK_SECRET = Deno.env.get('PAYMENT_WEBHOOK_SECRET');
const PROVIDER = 'gateway';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!WEBHOOK_SECRET) {
    console.error('PAYMENT_WEBHOOK_SECRET não configurado.');
    return new Response('Not configured', { status: 500 });
  }

  const rawBody = await req.text();
  if (rawBody.length > 64 * 1024) return new Response('Payload too large', { status: 413 });

  const valid = await verifyWebhookSignature(req.headers.get('X-Payment-Signature'), rawBody, WEBHOOK_SECRET);
  if (!valid) {
    console.warn('Webhook com assinatura inválida — ignorado.');
    return new Response('Unauthorized', { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const event = normalizePaymentEvent(body);
  if (!event) {
    // Evento que não nos diz respeito: 200 para o provedor não reenviar.
    return new Response('Ignored', { status: 200 });
  }

  const { data, error } = await admin.rpc('apply_payment_event', {
    p_provider: PROVIDER,
    p_event_id: event.eventId,
    p_order_number: event.orderNumber,
    p_status: event.status,
    p_amount: event.amount,
    p_reference: event.reference,
    p_payload: body,
  });

  if (error) {
    // 500 → o provedor volta a tentar; a idempotência evita efeitos duplicados.
    console.error('apply_payment_event falhou:', error.message);
    return new Response('Error', { status: 500 });
  }

  if (data === 'valor_divergente') {
    console.error(`Pagamento de ${event.orderNumber} com valor divergente — encomenda NÃO confirmada, rever manualmente.`);
  }
  console.log(`Webhook ${event.eventId} (${event.status}) → ${event.orderNumber}: ${data}`);
  return new Response('OK', { status: 200 });
});
