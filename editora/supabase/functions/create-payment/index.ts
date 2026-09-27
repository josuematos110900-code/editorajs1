// Edge Function: create-payment
//
// Cria uma sessão de checkout no provedor de pagamentos para uma encomenda
// do utilizador autenticado e devolve o URL para onde o browser deve ir.
// Secrets (Supabase > Edge Functions > create-payment > Secrets):
//   PAYMENT_API_KEY  — chave privada do provedor (NUNCA no frontend)
//   PAYMENT_API_URL  — endpoint de criação de checkout do provedor
//   APP_URL          — URL pública do site (para os redirecionamentos)
//
// O pedido ao provedor está isolado em createCheckoutSession(): é o único
// sítio a adaptar à API real do provedor escolhido. Sem PAYMENT_API_KEY /
// PAYMENT_API_URL a função responde 503 e o site pede outro método.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const PAYMENT_API_KEY = Deno.env.get('PAYMENT_API_KEY');
const PAYMENT_API_URL = Deno.env.get('PAYMENT_API_URL');
const APP_URL = Deno.env.get('APP_URL') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': APP_URL || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

interface CheckoutRequest {
  reference: string;
  amount: number;
  currency: string;
  customer: { name: string; email: string };
  successUrl: string;
  cancelUrl: string;
}

async function createCheckoutSession(req: CheckoutRequest): Promise<string> {
  const res = await fetch(PAYMENT_API_URL!, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAYMENT_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference: req.reference,
      amount: req.amount,
      currency: req.currency,
      customer: req.customer,
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
    }),
  });
  if (!res.ok) throw new Error(`Provedor respondeu ${res.status}`);
  const data = await res.json();
  const url = data?.checkout_url ?? data?.url;
  if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('Resposta do provedor sem URL de checkout.');
  return url;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!PAYMENT_API_KEY || !PAYMENT_API_URL) return json({ error: 'Pagamento online não configurado.' }, 503);

  // Cliente com o JWT do utilizador: a RLS garante que só lê as suas encomendas.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ error: 'Não autenticado.' }, 401);

  let orderId: string | undefined;
  try {
    orderId = (await req.json())?.orderId;
  } catch {
    return json({ error: 'Pedido inválido.' }, 400);
  }
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: 'Pedido inválido.' }, 400);

  const { data: order } = await supabase
    .from('orders')
    .select('id, number, total, status, customer_name, customer_email, user_id, payments(method, status)')
    .eq('id', orderId)
    .maybeSingle();

  const payment = Array.isArray(order?.payments) ? order?.payments[0] : order?.payments;
  if (!order || order.user_id !== userData.user.id) return json({ error: 'Encomenda não encontrada.' }, 404);
  if (order.status !== 'pendente' || payment?.status !== 'pendente' || payment?.method !== 'gateway') {
    return json({ error: 'Esta encomenda não está a aguardar pagamento online.' }, 409);
  }

  try {
    const redirectUrl = await createCheckoutSession({
      reference: order.number,
      amount: order.total,
      currency: 'AOA',
      customer: { name: order.customer_name, email: order.customer_email },
      successUrl: `${APP_URL}/encomenda/${order.id}?pagamento=sucesso`,
      cancelUrl: `${APP_URL}/encomenda/${order.id}?pagamento=cancelado`,
    });
    return json({ redirectUrl });
  } catch (err) {
    console.error('create-payment:', err instanceof Error ? err.message : err);
    return json({ error: 'Pagamento online indisponível.' }, 502);
  }
});
