# Configuração do pagamento em Angola (Okanda Pay)

O plano Premium em Angola custa **3.000 Kz / 30 dias** (configurado em
`src/lib/plans.ts`), pago através do Okanda Pay como **pagamento único
sem renovação automática** (diferente do Brasil, que é assinatura
recorrente via Cakto).

## Estado atual

⚠️ **Dependência externa — nada aqui foi ativado ainda.** O código está
pronto, mas falta a conta/integração real do Okanda Pay:

- `src/lib/checkout.ts` lê o link de checkout de
  `VITE_OKANDA_CHECKOUT_URL` (ver `.env.example`). Enquanto essa
  variável não estiver definida, o botão de upgrade em Angola mostra:
  *"O pagamento em Angola está temporariamente indisponível."* — nunca
  abre uma janela vazia nem finge que o pagamento foi confirmado.
- O schema já suporta este fluxo: colunas `country`, `currency`,
  `provider_customer_id`, etc. em `subscriptions`
  (`supabase/migrations/002_security_hardening.sql`), e a função
  `expire_non_renewing_premium()` (`supabase/schema.sql`) que expira
  automaticamente o Premium comprado sem renovação, 30 dias depois do
  pagamento — sem nunca apagar dados do utilizador.

## O que falta fazer, assim que houver conta Okanda Pay

1. **Confirmar a documentação oficial do Okanda Pay** (formato do
   checkout, se há webhook de confirmação de pagamento ou se é
   validação manual/redirecionamento) — este ambiente de
   desenvolvimento não tem acesso à internet para consultar essa
   documentação, por isso o adapter ainda não foi escrito. Não
   inventes o formato: implementa a partir da doc real quando a
   tiveres.
2. Criar o produto/link de checkout no Okanda Pay para 3.000 Kz.
3. Preencher `VITE_OKANDA_CHECKOUT_URL` no `.env.local` de produção
   (Netlify/Vercel — nunca no código).
4. Se o Okanda Pay tiver webhook de confirmação: criar uma Edge
   Function `okanda-webhook` seguindo exatamente o mesmo padrão de
   `supabase/functions/cakto-webhook/index.ts` — idempotência via
   `billing_events` (`provider = 'okanda'`), preenchimento dos campos
   comerciais de `subscriptions`, e nunca ativar Premium a partir do
   frontend.
5. Se não houver webhook (confirmação manual): documentar o processo
   operacional (ex: um admin confirma o pagamento e ativa manualmente
   via SQL/painel admin) — nunca dar ao próprio utilizador uma forma de
   se auto-ativar Premium.

## Não fazer

- Não ativar Premium diretamente no clique do botão de checkout — só
  depois de confirmação real do pagamento (webhook ou confirmação
  manual documentada).
- Não inventar um endpoint, formato de payload ou header do Okanda Pay
  que não estejam confirmados pela documentação oficial.
