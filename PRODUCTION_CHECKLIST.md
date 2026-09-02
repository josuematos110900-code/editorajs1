# Checklist de produção — FinançasPro Comercial v1.0

## A. Antes de aceitar o primeiro cliente real

- [ ] `supabase/schema.sql` aplicado no projeto Supabase de produção.
- [ ] `supabase/migrations/002_security_hardening.sql` aplicado (se o
      schema.sql usado for anterior a esta versão — a versão atual já
      o inclui colado no fim).
- [ ] `supabase/migrations/003_billing_engine.sql` aplicado.
- [ ] `supabase/migrations/004_race_conditions.sql` aplicado.
- [ ] `.env.local`/variáveis de ambiente de produção com
      `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` corretos.
- [ ] Edge Function `cakto-webhook` publicada
      (`supabase functions deploy cakto-webhook`).
- [ ] Secret `CAKTO_WEBHOOK_SECRET` definido nos Secrets da função
      (nunca em `.env`/`VITE_*`) — ver [`CAKTO_SETUP.md`](./CAKTO_SETUP.md).
- [ ] Webhook configurado no painel da Cakto a apontar para a Edge
      Function, com a mesma chave secreta.
- [ ] Payload real da Cakto testado e os nomes de campo confirmados
      contra `supabase/functions/cakto-webhook/index.ts` (ver aviso no
      topo desse ficheiro e em `CAKTO_SETUP.md`).
- [ ] Edge Functions `welcome-email` e `trial-reminder-cron` publicadas,
      com `RESEND_API_KEY` configurado.
- [ ] Um utilizador promovido a `role = 'admin'` manualmente no SQL
      Editor (nunca pelo frontend).
- [ ] Pelo menos um teste manual completo da secção B abaixo feito em
      produção (não só em ambiente de desenvolvimento).
- [x] Link de checkout do Vanqir Pay (Angola) já configurado em
      `src/lib/checkout.ts` (substituível via `VITE_VANQIR_CHECKOUT_URL`).
- [ ] Confirmação automática do pagamento Vanqir Pay (webhook ou
      processo manual documentado) — ver [`ANGOLA_PAYMENT_SETUP.md`](./ANGOLA_PAYMENT_SETUP.md).
      Sem isso, o checkout abre normalmente mas o Premium não ativa
      sozinho depois de pagar (por desenho — nunca ativamos Premium só
      pelo clique no checkout).
- [ ] Migration `005_vanqir_provider.sql` aplicada no Supabase de produção.

## B. Sequência de teste manual guiado

Segue esta ordem — cada teste depende do anterior.

1. **Criar utilizador novo** — regista uma conta nova com email real
   (ou um que recebas). Confirma que chega o email de boas-vindas.
2. **Confirmar Trial** — depois do onboarding, confirma em
   Configurações/`/assinatura` que aparece "Plano Premium — Teste" e
   uma contagem regressiva de 14 dias.
3. **Criar dados Free** — cria 2 contas, 2 metas, 2 dívidas, 5
   orçamentos, 3 recorrentes (os limites do Free) — todos devem
   funcionar normalmente durante o trial (que é Premium).
4. **Atingir limite** — muda manualmente a subscription para
   `plan='free', status='active'` no SQL Editor (simula o fim do
   trial) e tenta criar mais um recurso de cada tipo. Confirma a
   mensagem exata "Limite de N atingido" e o CTA de upgrade (Paywall).
5. **Upgrade** — clica em "Fazer upgrade" em `/assinatura`. Confirma
   que abre o checkout da Cakto (Brasil) numa nova aba, com o email
   pré-preenchido, e que a app **não** ativa Premium nesse clique.
6. **Confirmar pagamento** — completa um pagamento de teste na Cakto
   (ou simula o webhook manualmente com `curl`).
7. **Confirmar Premium** — depois do webhook processar, `/assinatura`
   mostra "Plano Premium — Ativo", com valor, fornecedor e datas
   corretos, e os limites deixam de aplicar-se.
8. **Cancelar** — envia um evento `subscription_canceled` (ou usa o
   fluxo real da Cakto). Confirma a mensagem "O teu Premium permanece
   ativo até [data]" e que o acesso continua Premium.
9. **Expirar** — muda `current_period_end` para ontem e corre
   `select public.expire_subscriptions();`. Confirma a mensagem "O teu
   Premium terminou. Os teus dados continuam guardados." e que o plano
   passa a Free.
10. **Confirmar dados preservados** — todas as contas, metas, dívidas,
    transações e relatórios criados enquanto Premium continuam visíveis
    e corretos depois da expiração.
11. **Testar segundo utilizador** — regista um User B independente.
12. **Testar isolamento dos dados** — com a sessão do User B, confirma
    que não consegue ver, editar nem apagar nada do User A (ver
    `supabase/SECURITY_TESTS.md`, secção 3, para os testes exatos).

## C. Sinais de que algo está errado (nunca ignorar)

- Uma renovação criou uma segunda linha em `subscriptions` para o mesmo
  utilizador → bug crítico de idempotência, investigar já.
- Um utilizador Free conseguiu ultrapassar o limite → falha de RLS/RPC
  ou da migration 004 não aplicada.
- Um erro `PGRST`/`42501`/stack trace apareceu na interface → falha em
  `rpcErrors.ts`/`translateRpcError` nalgum ponto não coberto — reporta
  e corrige a tradução, nunca deixes o erro cru visível.
- Dados desapareceram depois de uma expiração/downgrade → **bug crítico
  de perda de dados**, parar tudo e investigar (nunca deveria acontecer
  — nenhuma rotina deste projeto apaga dados por causa do plano).
