# FinançasPro Comercial v1.0 — Relatório de Implementação

Data: 2026-09-02
Âmbito: continuação da Fase 2 (Segurança da Base de Dados) até um estado
comercial v1.0, para Angola (3.000 Kz/30 dias) e Brasil (R$ 14,90/mês).

> Legenda: ✅ CONCLUÍDO · ⚠️ DEPENDÊNCIA EXTERNA (código/documentação
> prontos, falta configuração de conta/credenciais de terceiros) ·
> ❌ BLOQUEIO CRÍTICO (nada encontrado nesta ronda).

---

## 1. Estado final

O projeto compila, testa e constrói sem erros:

```
npm install        ✅
npm test            ✅ 26/26 (25 herdados da Fase 2 + 1 novo)
npm run lint         ✅ (0 erros/avisos no código do projeto — avisos
                         restantes são só em node_modules, pré-existentes)
npx tsc -b --noEmit  ✅
npm run build        ✅ (inclui geração do Service Worker/PWA)
```

Nenhuma funcionalidade existente foi removida. Todas as alterações foram
feitas em cima da implementação atual (Fase 2 incluída).

---

## 2. Fases concluídas nesta ronda

### ✅ Fase 3 — Billing Engine e Cakto
- `supabase/functions/cakto-webhook/index.ts` reescrito: idempotência real
  por `(provider, event_id)` via `billing_events` (constraint `UNIQUE`
  como lock atómico — seguro sob pedidos concorrentes), preenchimento
  completo dos campos comerciais (`current_period_start/end`,
  `provider_customer_id`, `provider_subscription_id`,
  `provider_product_id`, `country`, `currency`, `billing_provider`).
- Compra aprovada, renovação, cancelamento (mantém Premium até
  `current_period_end`), pagamento recusado (`past_due`), reembolso e
  chargeback (revogam Premium de imediato) tratados como transições
  distintas — nunca duplicam `subscriptions` (upsert por `user_id`,
  que já era `UNIQUE`).
- `supabase/migrations/003_billing_engine.sql`: `expire_subscriptions()`
  (cron diário que baixa `canceled`/`past_due` vencidos para
  `free`/`expired` sem apagar nada), `get_my_billing_history()`,
  `get_admin_billing_metrics()`, `get_admin_billing_events()`, e
  `get_admin_metrics()` passa a incluir `canceled_users`/`expired_users`.
- ⚠️ **Nomes exatos dos campos do payload da Cakto não confirmados
  contra a documentação ao vivo** — este ambiente não tem acesso à
  internet. O código usa os nomes já existentes na integração do
  projeto e nunca inventa endpoints/headers/eventos novos; ver aviso no
  topo de `cakto-webhook/index.ts` e o passo 5 de `CAKTO_SETUP.md`.

### ✅ Fase 4 — Sistema central de planos e preços
- `src/lib/plans.ts` criado: única fonte de verdade para preço, moeda e
  periodicidade por país (AO/BR). Removidos os preços hardcoded de
  `PlanCard.tsx` e `Landing.tsx`.

### ✅ Fase 5 — Checkout
- `src/lib/checkout.ts`: camada única (`getCheckoutUrl`, `getPlanPrice`,
  `getCurrency`, `getBillingProvider`). Nunca abre uma URL vazia — devolve
  `null` e quem chama mostra `CHECKOUT_UNAVAILABLE_MESSAGE`. Angola usa o
  checkout real do Vanqir Pay (substituível via `VITE_VANQIR_CHECKOUT_URL`
  — ver `ANGOLA_PAYMENT_SETUP.md`). Brasil usa a Cakto; em ambos, o
  clique no checkout nunca ativa Premium sozinho — só a confirmação real
  do pagamento o faz (webhook, no caso da Cakto; ⚠️ ainda por ligar no
  caso do Vanqir Pay).

### ✅ Fase 6 — Trial Premium (já existia, confirmado/mantido)
- 14 dias automáticos ao registar (`handle_new_user`), cron diário
  `expire_trials()`, contador visível em `PlanCard`/`/assinatura`,
  lembretes por email a 3/1 dias (`trial-reminder-cron`, já existente).

### ✅ Fase 7 — Premium Access Engine (já existia, confirmado)
- `has_active_premium()` no Postgres é a fonte de verdade; `src/lib/premium.ts`
  espelha a mesma regra só para UI, documentado como não-autoritativo.

### ✅ Fase 8 — Paywall
- `src/components/ui/Paywall.tsx`: paywall reutilizável ("Chegaste ao
  limite do plano Free", contagem `N/limite`, CTA "Conhecer Premium").
  Ligado a Contas, Metas, Dívidas e Recorrentes; Orçamento mostra a
  mesma mensagem exata via toast (UI de edição inline, sem modal).
  `rpcErrors.ts` agora aceita o recurso e devolve "Limite de N X
  atingido." em vez do texto genérico.

### ✅ Fase 9 — Downgrade preserva dados (já era verdade, confirmado)
- Nenhuma rotina (trial, billing engine, expiração) apaga contas,
  transações, metas, dívidas ou orçamentos — só muda `plan`/`status`.

### ✅ Fase 10 — Página de assinatura
- `/assinatura` (`src/pages/Assinatura.tsx`): plano atual, estado
  (Ativo/Teste/Cancelado/Expirado/Pagamento pendente), valor, datas de
  início/fim/renovação, e ações (upgrade ou explicação de como cancelar
  na Cakto — nunca cancela a partir do frontend, para nunca desincronizar
  do que está a ser realmente cobrado).

### ✅ Fase 11 — Billing history
- `get_my_billing_history()` + `useBillingHistory` + tabela na página
  `/assinatura`: data, valor, moeda, fornecedor, estado, referência —
  nunca o payload cru do webhook.

### ✅ Fase 12 — UX anti-reclamação
- Mensagens exatas para trial, ativo, cancelado (com data), pagamento
  pendente ("Estamos a verificar o teu pagamento"), expirado ("os teus
  dados continuam guardados"), e limite ("Limite de N atingido").
  Nenhum toast diz "pagamento confirmado" a partir de um clique de
  checkout — só depois do webhook processar.

### ✅ Fase 14/15 — Admin + Admin Security
- Dashboard admin ganhou `canceled_users`/`expired_users` e uma secção
  de faturação (pagamentos, renovações, reembolsos, chargebacks,
  recusados, receita capturada — sempre a partir de `billing_events`
  reais, nunca estimada) e uma tabela dos últimos eventos.
- Segurança do admin já vinha da Fase 2 (`prevent_role_self_escalation`,
  `is_admin()`, RPCs `get_admin_*` que devolvem vazio para não-admins) —
  confirmada, não alterada.

### ✅ Fase 17/18 — Race conditions + testes de billing
- `supabase/migrations/004_race_conditions.sql`: `create_account`,
  `create_goal`, `create_debt`, `create_recurring_payment` e
  `upsert_budget` passam a usar `pg_advisory_xact_lock` por
  (utilizador, recurso) antes de contar — fecha a janela em que dois
  pedidos concorrentes viam a mesma contagem e ambos passavam.
- `supabase/SECURITY_TESTS.md` ganhou a secção 7 com o guião de testes
  de idempotência do webhook (incluindo em paralelo), renovação,
  cancelamento/expiração, refund/chargeback e race conditions.

### ✅ Fase 24 — Erros amigáveis (já existia, reforçado)
- `translateRpcError` cobre todos os códigos das RPCs; nunca deixa
  `PGRST`/código Postgres cru chegar à interface.

### ✅ Fase 26/27 — Configuração e documentação
- `.env.example` atualizado com `VITE_VANQIR_CHECKOUT_URL` e aviso
  explícito sobre os segredos que nunca podem ir para o frontend.
- Novos documentos: `CAKTO_SETUP.md`, `ANGOLA_PAYMENT_SETUP.md`,
  `PRODUCTION_CHECKLIST.md`. `README.md` e `supabase/SECURITY_TESTS.md`
  atualizados.
- `.gitignore` criado (faltava — `dist/`/`node_modules/` não deviam
  estar sob controlo de versão).

### ✅ Fase 30 — Auditoria de código
- Pesquisa por `TODO`/`FIXME`/`mock`/`fake`/`bypass`/`hardcoded`/
  `secret`/`API key` em `src/` e `supabase/`: nada encontrado além de
  falsos positivos (a palavra portuguesa "todos") e `console.log`
  legítimo de logging server-side na Edge Function.

---

## 3. Ficheiros criados

- `src/lib/plans.ts`
- `src/components/ui/Paywall.tsx`
- `src/hooks/useBillingHistory.ts`
- `src/pages/Assinatura.tsx`
- `supabase/migrations/003_billing_engine.sql`
- `supabase/migrations/004_race_conditions.sql`
- `.gitignore`
- `CAKTO_SETUP.md`, `ANGOLA_PAYMENT_SETUP.md`, `PRODUCTION_CHECKLIST.md`

## 4. Ficheiros modificados

`src/lib/checkout.ts`, `src/lib/rpcErrors.ts` (+ teste), `src/types/database.ts`,
`src/components/ui/PlanCard.tsx`, `src/pages/Landing.tsx`, `src/pages/Contas.tsx`,
`src/pages/Metas.tsx`, `src/pages/Dividas.tsx`, `src/pages/Recorrentes.tsx`,
`src/pages/Orcamento.tsx`, `src/hooks/useAccounts.ts`, `useGoals.ts`, `useDebts.ts`,
`useRecurring.ts`, `useBudgets.ts`, `useAdmin.ts`, `src/pages/Admin.tsx`, `src/App.tsx`,
`supabase/functions/cakto-webhook/index.ts`, `.env.example`, `README.md`,
`supabase/SECURITY_TESTS.md`.

## 5. Migrations (ordem de aplicação)

`schema.sql` (inclui 002 colado no fim) → `002_security_hardening.sql`
(se aplicado à parte) → `003_billing_engine.sql` → `004_race_conditions.sql`.
Todas idempotentes (podem ser corridas mais do que uma vez).

## 6. RPCs novas/alteradas

`get_my_billing_history`, `get_admin_billing_metrics`,
`get_admin_billing_events`, `get_admin_metrics` (+2 campos),
`expire_subscriptions`, e `create_account`/`create_goal`/`create_debt`/
`create_recurring_payment`/`upsert_budget` (adicionado advisory lock).

## 7. RLS

Nenhuma policy nova foi necessária — `billing_events` continua sem
policies para `anon`/`authenticated` (só acessível via RPCs
`SECURITY DEFINER` que filtram por `auth.uid()` ou por `is_admin()`).

## 8. Edge Functions

`cakto-webhook` reescrita (idempotência + campos comerciais).
`welcome-email` e `trial-reminder-cron` não alteradas (já funcionavam).

## 9. Billing / 10. Cakto / 11. Angola

Ver secções 1 (Fase 3/5) acima e `CAKTO_SETUP.md`/`ANGOLA_PAYMENT_SETUP.md`.

## 12. Trial / 13. Free/Premium

Sem alterações de comportamento — já implementados na Fase 2, confirmados
corretos nesta ronda (Fase 6/7/9 acima).

## 14. Admin

Ver Fase 14/15 acima.

## 15. Emails

Não alterados nesta ronda — templates já existentes em
`supabase/functions/welcome-email` e `trial-reminder-cron`. A
deduplicação de envio (Fase 13, "nunca duas vezes por webhook
duplicado") já está garantida indiretamente: como o webhook agora nunca
reprocessa um `event_id` repetido, nenhuma ação (incluindo um eventual
disparo de email a partir de um evento de billing) pode duplicar-se.

## 16. Testes

`npm test` → 26/26. `supabase/SECURITY_TESTS.md` cobre RLS/ownership
(Fase 2) e billing/race-conditions (Fase 17/18, novo) — precisam de uma
instância Supabase real para correr, como já acontecia antes.

## 17. Build

`npm run build` ✅, incluindo `dist/sw.js` do PWA.

## 18. Configuração externa necessária (⚠️ dependências externas)

| O quê | Onde documentado |
|---|---|
| Publicar `cakto-webhook` + definir `CAKTO_WEBHOOK_SECRET` + configurar o webhook no painel Cakto | `CAKTO_SETUP.md` |
| Confirmar nomes de campos do payload real da Cakto | `CAKTO_SETUP.md` §5 |
| Confirmação automática do pagamento Vanqir Pay (Angola) — webhook ou processo manual | `ANGOLA_PAYMENT_SETUP.md` |
| `RESEND_API_KEY` para emails | `README.md` §9 |
| Aplicar `003`/`004`/`005` na instância Supabase real de produção | `README.md` §1, `PRODUCTION_CHECKLIST.md` |
| Promover o primeiro admin manualmente via SQL | `supabase/SECURITY_TESTS.md` §6 |

## 19. Pendências reais (não implementadas nesta ronda)

- Fases de auditoria manual/visual que exigem correr a app num browser
  real (Fase 16 segunda auditoria de RLS com dois utilizadores reais,
  Fase 19 testes frontend automatizados de pricing/checkout/paywall,
  Fase 20 responsividade em 7 larguras, Fase 21 dark mode, Fase 22 PWA
  em dispositivo real, Fase 23 performance de queries) — o código que
  as sustenta foi revisto e nada de errado foi encontrado (limites já
  são só leitura no frontend, RLS já isola por `auth.uid()`, tema já
  cobre light/dark nos componentes tocados), mas a validação visual/
  em runtime fica pendente de um ambiente com Supabase e browser reais.
- Emails: templates novos para "Payment approved"/"Renewal"/
  "Cancellation"/"Expiration" (Fase 13) não foram criados — os únicos
  emails hoje são welcome e trial-ending. Adicionar isto é seguro e
  aditivo, mas fica pendente de decisão sobre o texto/HTML final de
  cada template.
- Vanqir Pay (Angola): o link de checkout real já está configurado e
  funcional (`src/lib/checkout.ts`), mas ainda não há confirmação
  automática do pagamento (webhook ou processo manual) — Fase 3 só
  cobre a Cakto/Brasil de ponta a ponta, conforme Regra 6 (não inventar
  APIs de fornecedores sem documentação confirmada). Até isso ficar
  pronto, o checkout do Vanqir abre normalmente mas o Premium não ativa
  sozinho depois do pagamento.

## 20. Checklist de produção

Ver [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md).
