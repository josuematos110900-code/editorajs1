# Testes de segurança — Migration 002

Estes testes não podem ser corridos automaticamente sem uma instância
Supabase real (RLS depende de `auth.uid()`, que só existe num pedido
autenticado de verdade). Faz assim, depois de aplicar a migration:

## Preparação

1. Cria duas contas de teste: **User A** e **User B**.
2. Com o **User A**, cria 1 conta bancária, 1 meta e 1 dívida — anota os
   `id` (Supabase Dashboard > Table Editor).

## 1. Limites do plano Free (User A, ainda Free)

| Ação | Resultado esperado |
|---|---|
| Criar a 1ª conta | ✅ sucesso |
| Criar a 2ª conta | ✅ sucesso |
| Criar a 3ª conta | ❌ erro `LIMIT_REACHED` |
| Igual para metas (2), dívidas (2), recorrentes (3), orçamentos (5/mês) | mesmo padrão |

## 2. Premium ultrapassa os limites

1. No Table Editor, muda a subscription do User A: `plan='premium'`,
   `status='active'`, `current_period_end` = hoje + 30 dias.
2. Repete a criação da 3ª conta/meta/dívida → ✅ deve funcionar agora.

## 3. Ownership entre utilizadores (o mais crítico)

Com a sessão do **User B** (nunca usar o `service_role` aqui — tem de
ser um pedido autenticado normal, como o browser faz):

| Ação | Resultado esperado |
|---|---|
| `select * from transactions where account_id = '<conta do User A>'` | 0 linhas |
| Inserir uma transação com `account_id` = conta do User A | ❌ bloqueado pela RLS (nenhuma linha) |
| `supabase.rpc('create_recurring_payment', { p_account_id: '<conta do User A>', ... })` | ❌ erro `ACCOUNT_NOT_FOUND` |
| `select * from subscriptions where user_id = '<User A>'` | 0 linhas |
| `update profiles set role = 'admin' where id = auth.uid()` (o próprio User B) | linha "sucesso" mas o `role` continua `user` (o trigger reverte) |

## 4. Webhook idempotente

1. Envia o mesmo payload duas vezes para a Edge Function `cakto-webhook`
   (mesmo `event_id`, se/quando o payload da Cakto o incluir — ver
   secção 5, este passo faz parte da Fase 5/Cakto, não desta migration).
2. Confirma em `billing_events` que só existe **uma** linha para esse
   `(provider, event_id)` — a constraint `unique (provider, event_id)`
   garante isto ao nível da base de dados.

## 5. Downgrade não apaga dados

1. Com o User A em Premium com 5 contas, muda manualmente a subscription
   de volta para `plan='free'`.
2. Confirma que as 5 contas continuam visíveis e com histórico intacto.
3. Confirma que criar uma 6ª conta agora dá `LIMIT_REACHED`.

## 6. Admin

1. Um utilizador com `role='user'` não consegue chamar
   `get_admin_metrics()`/`get_admin_users()` com dados úteis (a função
   devolve `null`/vazio para não-admins — confirma isto).
2. Só torna-te admin correndo manualmente no SQL Editor (contexto que
   não é `authenticated`, por isso o trigger não bloqueia):
   ```sql
   update public.profiles set role = 'admin' where id = 'O-TEU-USER-ID';
   ```

## 7. Billing engine (migrations 003/004) — Fase 3/17/18

Testes que dependem de uma instância Supabase real com as migrations
003 e 004 aplicadas.

### 7.1 Idempotência do webhook

1. Envia o mesmo payload de `purchase_approved` duas vezes seguidas para
   a Edge Function `cakto-webhook` (mesmo `event_id`).
2. Confirma:
   - `billing_events` tem **uma só linha** para esse `(provider, event_id)`.
   - `subscriptions` tem **uma só linha** para esse `user_id` (nunca
     duplica), `current_period_end` não avançou uma segunda vez.
3. Repete os dois pedidos **em paralelo** (dois `curl` ao mesmo tempo,
   ou um pequeno script com `Promise.all`) — o resultado deve ser
   idêntico: só um dos dois processa, o outro recebe
   "evento duplicado, ignorado" (200 OK, sem efeito).

### 7.2 Renovação não duplica

1. Com o User A já Premium (evento `purchase_approved` processado),
   envia um `subscription_renewed` com `event_id` diferente.
2. Confirma: continua a haver **uma só** linha em `subscriptions`,
   `current_period_end` avançou, e há agora **duas** linhas em
   `billing_events` (uma por evento, isso é esperado — o que não pode
   duplicar é a subscription).

### 7.3 Cancelamento mantém Premium até ao fim do período

1. Envia `subscription_canceled`.
2. Confirma: `status='canceled'`, `plan` continua `'premium'`,
   `current_period_end` não muda.
3. Chama `select public.has_active_premium('<user_id>')` → deve
   devolver `true` enquanto `current_period_end >= current_date`.
4. Muda manualmente `current_period_end` para ontem e corre
   `select public.expire_subscriptions();` → confirma que passa a
   `plan='free', status='expired'` e que `has_active_premium()` passa a
   `false`. As contas/metas/dívidas do utilizador continuam todas lá.

### 7.4 Refund/chargeback revogam de imediato

1. Com o User A Premium e `current_period_end` no futuro, envia
   `refund` (ou `chargeback`).
2. Confirma: `plan='free'`, `status='expired'` **imediatamente** (ao
   contrário do cancelamento normal, não espera pelo fim do período).

### 7.5 Race condition nos limites do Free

Com o User A no Free (0 contas):

1. Dispara **duas** chamadas a `create_account` em paralelo (ex:
   `Promise.all([supabase.rpc('create_account', {...}), supabase.rpc('create_account', {...})])`
   repetido até já existirem 2 contas, depois testa a 3ª/4ª em paralelo).
2. Resultado esperado: nunca mais do que 2 contas no total — uma das
   duas chamadas concorrentes para a 3ª conta tem de falhar com
   `LIMIT_REACHED`, mesmo tendo chegado ao "mesmo tempo". Repete para
   metas, dívidas, recorrentes e orçamentos.
