# Configuração da Cakto (Brasil)

O FinançasPro usa a [Cakto](https://cakto.com.br) para cobrar o plano
Premium no Brasil: **R$ 15,89/mês** (valor configurado em
`src/lib/plans.ts`).

## 1. Produto na Cakto

1. Cria um produto de **assinatura** (subscription) na Cakto com o valor
   R$ 15,89/mês.
2. Copia o link de checkout do produto e atualiza `CAKTO_CHECKOUT_URL`
   em `src/lib/checkout.ts` se for diferente do que já está lá.
3. **Importante**: o checkout do FinançasPro já envia `email` e
   `confirmEmail` pré-preenchidos com o email da conta do utilizador —
   isto é o que permite ao webhook associar o pagamento ao utilizador
   certo. Confirma que o produto na Cakto aceita esses parâmetros de
   URL (a maioria aceita).

## 2. Edge Function `cakto-webhook`

O código já está pronto em `supabase/functions/cakto-webhook/index.ts`.
Falta publicá-lo no Supabase:

```bash
supabase functions deploy cakto-webhook
```

## 3. Secret do webhook (server-side apenas)

No painel do Supabase: **Edge Functions > cakto-webhook > Secrets**,
define:

```
CAKTO_WEBHOOK_SECRET=<a mesma chave secreta configurada no produto da Cakto>
```

Nunca coloques este valor em `.env`, `.env.local` ou qualquer variável
`VITE_*` — isso exporia o segredo no bundle do browser. Ele só existe
nos secrets da Edge Function.

## 4. Configurar o webhook na Cakto

No painel do produto na Cakto, em **Webhooks**, aponta para:

```
https://<TEU-PROJETO>.supabase.co/functions/v1/cakto-webhook
```

e cola a mesma "Chave secreta" que puseste em `CAKTO_WEBHOOK_SECRET`.

## 5. ⚠️ Confirma os nomes dos campos do payload

Este ambiente de desenvolvimento não teve acesso à internet para validar
os nomes exatos dos campos que a Cakto envia (o código foi escrito a
partir da integração já existente no projeto, nunca inventando nomes
novos). Antes de ligar isto a tráfego real:

1. No painel da Cakto, usa a opção de **testar o webhook** (ou faz uma
   compra de teste) e olha para o payload recebido nos logs da Edge
   Function (`supabase functions logs cakto-webhook`).
2. Confirma que os campos usados em `supabase/functions/cakto-webhook/index.ts`
   correspondem: `event`, `data.customer.email`, `data.customer.id`,
   `data.product.id`, `data.product.type`, `data.subscription.id`,
   `data.subscription.next_payment_date`, e o identificador único do
   evento (`id` / `data.id` / `data.transaction_id` — usado para a
   idempotência em `resolveEventId()`).
3. Se algum nome for diferente, ajusta só essa função — a lógica de
   negócio (idempotência, ativação, renovação, cancelamento, reembolso,
   chargeback) não muda.

## 6. Eventos suportados

| Evento Cakto                     | Efeito no FinançasPro                                  |
|-----------------------------------|---------------------------------------------------------|
| `purchase_approved`               | Ativa Premium (`status=active`)                         |
| `subscription_created`            | Ativa Premium (`status=active`)                         |
| `subscription_renewed`            | Renova o período, mantém Premium                        |
| `subscription_canceled`           | `status=canceled` — mantém Premium até `current_period_end` |
| `subscription_renewal_refused`    | `status=past_due`                                        |
| `payment_refused` / `payment_declined` | `status=past_due`                                   |
| `refund` / `purchase_refunded`    | Revoga Premium imediatamente (`plan=free`, `status=expired`) |
| `chargeback`                      | Revoga Premium imediatamente (`plan=free`, `status=expired`) |

Todos os eventos passam primeiro por `billing_events` (idempotência —
ver `supabase/migrations/002_security_hardening.sql` e
`003_billing_engine.sql`): o mesmo `event_id` nunca é processado duas
vezes, mesmo sob pedidos concorrentes.

## 7. Cancelamento pelo cliente

O FinançasPro **não** cancela assinaturas Cakto a partir da app — isso
tem de ser feito na própria Cakto (área de cliente ou suporte), para
nunca desincronizar o que a app mostra do que realmente está a ser
cobrado. A página `/assinatura` explica isto ao utilizador.
