# FinançasPro — Relatório de implementação: Fase 2 (Segurança da BD)

## O que foi feito

### Auditoria (antes de alterar)
- `schema.sql`, todas as RLS existentes, hooks (`useAccounts`, `useGoals`,
  `useDebts`, `useRecurring`, `useBudgets`, `useTransactions`,
  `useAdmin`, `useSubscription`) e a Edge Function `cakto-webhook`.
- **Achado crítico:** o frontend já chamava 10 RPCs que **não existiam**
  em lado nenhum do projeto: `create_account`, `create_goal`,
  `add_goal_contribution`, `create_debt`, `register_debt_payment`,
  `create_recurring_payment`, `mark_recurring_payment_paid`,
  `transfer_between_accounts`, `upsert_budget`,
  `get_user_id_by_email`. Ou seja: **neste momento, em produção, ninguém
  consegue criar uma conta, meta, dívida, orçamento, recorrente,
  transferência ou receber o webhook da Cakto** — todas essas ações
  falhavam com "function does not exist". Isto foi a prioridade nº 1.
- **Achado crítico:** RLS de `transactions`/`budgets`/`recurring_payments`/
  `goal_contributions`/`debt_payments` só verificava `auth.uid() =
  user_id` na própria linha — nunca validava que `account_id`,
  `category_id`, `goal_id` ou `debt_id` pertenciam ao mesmo utilizador.
  Um User A conseguia inserir uma transação seu (`user_id = A`) apontada
  a uma `account_id` do User B, contaminando o saldo calculado da conta
  do User B (`account_balances`).
- **Achado crítico:** a policy `profiles_update_own` permitia a qualquer
  utilizador autenticado fazer `update profiles set role='admin' where
  id=auth.uid()` — auto-promoção a administrador.
- Limites do plano Free só existiam num ficheiro de UI
  (`planLimits.ts`) — sem qualquer imposição real no servidor.

### Migrations criadas
- `supabase/migrations/002_security_hardening.sql` (também anexada ao
  fim de `supabase/schema.sql`, para que colar só esse ficheiro num
  projeto novo já traga tudo).

### O que a migration faz
1. **`profiles`** — trigger `prevent_role_self_escalation`: reverte
   qualquer alteração ao `role` feita por uma sessão `authenticated`
   (o próprio utilizador). Continua a ser possível promover um admin
   manualmente pelo SQL Editor do Supabase.
2. **`subscriptions`** — adicionadas as colunas comerciais em falta:
   `country`, `currency`, `provider_customer_id`,
   `provider_subscription_id`, `provider_product_id`,
   `current_period_start`, `canceled_at`. Estado `status` passa a aceitar
   também `expired`.
3. **`billing_events`** — tabela nova, `unique (provider, event_id)` para
   idempotência de webhooks. RLS ativo sem nenhuma policy para
   `anon`/`authenticated` — só o `service_role` (Edge Functions) lê/escreve.
4. **`has_active_premium(user_id)`** — função única que decide se alguém
   tem Premium válido (considera `plan`, `status` e `current_period_end`;
   trata `canceled` como Premium até ao fim do período já pago, e nunca
   considera `past_due`/`expired` como Premium). É a fonte de verdade
   usada por todas as RPCs abaixo.
5. **RLS reforçado em 8 tabelas** (`categories`, `accounts`,
   `transactions`, `budgets`, `goals`, `goal_contributions`, `debts`,
   `debt_payments`, `recurring_payments`) — políticas separadas por
   operação (select/insert/update/delete), com:
   - Validação de ownership de toda referência a outra tabela
     (`account_id`, `category_id`, `goal_id`, `debt_id`,
     `transfer_to_account_id`, `parent_id`).
   - **Os limites do plano Free ficam também na própria RLS** (não só
     nas RPCs) — mesmo um pedido feito manualmente por REST, a
     contornar as RPCs, é bloqueado pela base de dados.
6. **9 RPCs criadas** (as que o frontend já chamava e não existiam),
   todas `security definer`, com `auth.uid()` obrigatório, validação de
   posse dos recursos referenciados, verificação de limite via
   `has_active_premium`, e erros previsíveis (`LIMIT_REACHED`,
   `ACCOUNT_NOT_FOUND`, `CATEGORY_NOT_FOUND`, `GOAL_NOT_FOUND`,
   `DEBT_NOT_FOUND`, `RECURRING_NOT_FOUND`, `SAME_ACCOUNT_TRANSFER`,
   `DUPLICATE_OPERATION`, `INVALID_AMOUNT`, `UNAUTHORIZED`):
   - `create_account`, `create_goal`, `add_goal_contribution`,
     `create_debt`, `register_debt_payment`, `create_recurring_payment`,
     `mark_recurring_payment_paid` (com índice único anti-duplo-clique),
     `transfer_between_accounts` (bloqueio das duas contas em ordem
     consistente para evitar deadlock), `upsert_budget`.
   - `get_user_id_by_email` — só `service_role` (usada pelo
     `cakto-webhook`), revogada de `anon`/`authenticated`.

### Ficheiros frontend alterados
- `src/types/database.ts` — `Subscription` alinhada com as novas
  colunas; `SubscriptionStatus` inclui `'expired'`; novo tipo
  `BillingProvider`.
- `src/lib/rpcErrors.ts` — mensagem amigável para `CATEGORY_NOT_FOUND`.
- `src/lib/premium.ts` (novo) — `hasActivePremium()`, espelha no
  frontend a mesma regra da função SQL, só para UI (nunca fonte de
  verdade).
- `src/lib/premium.test.ts` (novo) — 8 testes cobrindo trial, active,
  canceled dentro/fora do período pago, past_due, expired, free, sem
  subscription.

### Validação final
```
npm test           → 3 ficheiros, 25 testes, todos ✅
npm run lint        → 0 erros (4 avisos pré-existentes de fast-refresh, inofensivos)
npx tsc -b --noEmit  → ✅ sem erros
npm run build        → ✅ build gerado normalmente
```

### O que ficou pendente / precisa de configuração externa
- **Aplicar a migration na tua instância Supabase real** — cola
  `supabase/migrations/002_security_hardening.sql` no SQL Editor (ou o
  `schema.sql` completo, se for um projeto novo). Eu não tenho acesso
  à tua base de dados a partir daqui, por isso nada disto foi ainda
  executado contra dados reais.
- **Testes de RLS entre utilizadores** — só podem ser confirmados com
  duas contas reais autenticadas (ver `supabase/SECURITY_TESTS.md`,
  criado com o guia passo-a-passo).
- **Webhook idempotente de verdade** — a migration cria `billing_events`
  e a estrutura para isso, mas o `cakto-webhook` ainda não escreve lá
  (isso é explicitamente a Fase 5/Cakto, que combinámos deixar para
  depois).
- Preço de Angola hardcoded em `PlanCard.tsx` e link de Angola a `null`
  fixo em `checkout.ts` continuam por resolver — isso é a Fase
  "configuração central de planos" que também ficou para depois.

## Próxima fase sugerida
Com a base de dados agora blindada, a sequência lógica é: (1) ligar o
`cakto-webhook` a `billing_events` para idempotência real, ou (2) a
configuração central de planos + paywall/UI de assinatura. Diz-me qual
preferes.
