# FinançasPro

Aplicação web completa de gestão financeira pessoal para **Angola** e **Brasil**, construída com React, TypeScript e Supabase.

Permite: distribuir automaticamente o salário, definir orçamentos por categoria, registar receitas e despesas, criar metas financeiras, controlar poupança e dívidas, gerir múltiplas contas/carteiras, acompanhar pagamentos recorrentes, receber alertas inteligentes e consultar relatórios — tudo com os dados protegidos por utilizador via Row Level Security no Supabase.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estilo | Tailwind CSS |
| Dados/Auth | Supabase (PostgreSQL + Supabase Auth) |
| Estado servidor | TanStack Query (React Query) |
| Gráficos | Recharts |
| Ícones | Lucide |
| PWA | vite-plugin-pwa |
| Testes | Vitest |

---

## 1. Configurar o Supabase

1. Cria um projeto gratuito em [supabase.com](https://supabase.com).
2. Vai a **SQL Editor > New query**, cola todo o conteúdo do ficheiro [`supabase/schema.sql`](./supabase/schema.sql) e executa (`Run`).
   - Isto cria todas as tabelas, ativa o **Row Level Security** em todas elas, cria as políticas de isolamento por utilizador, e cria o trigger que gera automaticamente o perfil + 22 categorias padrão quando um novo utilizador se regista. `schema.sql` já inclui o conteúdo da migration 002 colado no fim, por isso um projeto novo fica pronto só com este passo.
3. Corre depois, por esta ordem, as migrations em `supabase/migrations/` que ainda não estejam refletidas em `schema.sql` (num projeto já existente que só tinha 002, basta isto):
   - [`003_billing_engine.sql`](./supabase/migrations/003_billing_engine.sql) — motor de faturação: idempotência de webhooks, histórico de pagamentos, métricas de billing para o admin.
   - [`004_race_conditions.sql`](./supabase/migrations/004_race_conditions.sql) — fecha uma condição de corrida nos limites do plano Free sob pedidos concorrentes.
   - [`005_vanqir_provider.sql`](./supabase/migrations/005_vanqir_provider.sql) — aceita `'vanqir'` como fornecedor de pagamento (Angola).
4. Vai a **Project Settings > API** e copia:
   - `Project URL`
   - `anon public key`
4. (Opcional, recomendado em produção) Em **Authentication > Providers > Email**, confirma se queres exigir confirmação de email antes do primeiro login.
5. (Opcional) Em **Authentication > URL Configuration**, define o `Site URL` para o domínio onde vais publicar a aplicação, e adiciona `/redefinir-senha` aos `Redirect URLs` para a recuperação de senha funcionar em produção.

## 2. Variáveis de ambiente

Copia `.env.example` para `.env.local` e preenche:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANONIMA_PUBLICA
VITE_VANQIR_CHECKOUT_URL=
```

**Nunca** coloques a `service_role key`, `CAKTO_WEBHOOK_SECRET` ou `RESEND_API_KEY` no frontend, nem em variáveis `VITE_*` — só a `anon public key` é segura para o browser, porque o acesso aos dados é controlado pelas políticas de RLS no Supabase. Os outros segredos vivem apenas nos **Secrets** das Edge Functions (ver secção 9 e [`CAKTO_SETUP.md`](./CAKTO_SETUP.md)).

## 3. Executar localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## 4. Testes

```bash
npm run test        # testes unitários dos cálculos financeiros (Vitest)
npm run lint         # análise estática
npx tsc -b --noEmit  # verificação de tipos
```

## 5. Build de produção

```bash
npm run build     # gera a pasta dist/
npm run preview   # pré-visualiza o build de produção localmente
```

## 6. Deploy

### Opção A — Vercel

1. Faz push deste repositório para o GitHub/GitLab.
2. Em [vercel.com](https://vercel.com), importa o repositório.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Em **Environment Variables**, adiciona `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do teu projeto Supabase.
5. Deploy.

O ficheiro `vercel.json` incluído já configura o *rewrite* necessário para o SPA routing.

### Opção B — Netlify

1. Faz push deste repositório para o GitHub/GitLab, **ou** arrasta a pasta `dist/` (depois de correres `npm run build`) diretamente para [app.netlify.com/drop](https://app.netlify.com/drop) para um deploy rápido de teste.
2. Para deploy ligado ao Git: em [app.netlify.com](https://app.netlify.com), **Add new site > Import an existing project**, escolhe o repositório.
3. Build command: `npm run build`. Publish directory: `dist`. (O ficheiro `netlify.toml` incluído já define isto automaticamente, incluindo o redirect para o SPA routing funcionar em rotas como `/dividas`.)
4. Em **Site configuration > Environment variables**, adiciona `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Deploy.

### Depois do deploy (qualquer uma das opções)

Volta ao Supabase (**Authentication > URL Configuration**) e atualiza o `Site URL` e os `Redirect URLs` para o domínio real (ex: `https://o-teu-site.netlify.app` ou `https://o-teu-site.vercel.app`), para o login, registo e recuperação de senha funcionarem corretamente em produção.

## 7. Estrutura do projeto

```
src/
  components/     # componentes reutilizáveis (layout, ui, transactions…)
  context/        # AuthContext, ProfileContext, ThemeContext, ToastContext
  hooks/          # hooks de dados (React Query) para cada entidade
  lib/            # lógica pura: cálculos financeiros, moeda, alertas, assistente
  pages/          # uma página por rota
  types/          # tipos TypeScript que espelham o schema do Supabase
supabase/
  schema.sql      # schema completo + RLS, pronto a colar no SQL Editor
```

A lógica de cálculo financeiro (saldo, orçamento, "quanto posso gastar hoje", progresso de metas e dívidas) está isolada em `src/lib/finance.ts` como funções puras, testadas em `src/lib/finance.test.ts` — o mesmo motor é usado no Dashboard, Contas, Orçamento e Relatórios, o que garante que os números nunca ficam inconsistentes entre ecrãs.

## 8. Funcionalidades incluídas

- Autenticação: registo, login, logout, recuperação de senha, sessão persistente, rotas protegidas
- Onboarding guiado (país, moeda, rendimento, distribuição do salário, primeira conta)
- Receitas e despesas com categorias (16 despesas + 6 receitas criadas automaticamente), edição, eliminação, pesquisa e filtros
- Distribuição automática do rendimento por percentagens configuráveis (Necessidades/Poupança/Investimentos/Lazer/Metas)
- "Quanto posso gastar hoje?" — cálculo dinâmico com base no saldo, despesas, recorrentes por vencer e contribuições para metas
- Orçamento por categoria com alertas visuais em 70% / 90% / 100%
- Metas financeiras com progresso, valor sugerido a poupar por mês/semana e data estimada
- Poupança associada às metas, com histórico de contribuições
- Dívidas com progresso de pagamento e histórico de pagamentos
- Múltiplas contas/carteiras com saldo individual e transferências entre contas (sem afetar receitas/despesas)
- Pagamentos recorrentes com registo automático da transação e avanço da próxima data
- Dashboard com gráficos (evolução financeira, despesas por categoria), próximos vencimentos e alertas
- Relatórios por período com comparação (ex: Agosto vs Julho)
- Alertas inteligentes gerados a partir de dados reais (sem valores fictícios)
- Assistente financeiro por regras (sem IA externa nesta versão — arquitetura pronta para integrar um LLM no futuro)
- Modo claro/escuro, layout responsivo (mobile-first com navegação inferior, sidebar em desktop)
- PWA instalável (ícone, manifest, service worker com cache)
- Moeda configurável (Kz — Angola, R$ — Brasil)

## 9. Micro-SaaS: planos, trial, billing e admin

O FinançasPro é um micro-SaaS comercial completo:

- **Planos Free/Premium** com preço e moeda centralizados em `src/lib/plans.ts` (Angola: 3.000 Kz/30 dias · Brasil: R$ 14,90/mês) — nenhum componente tem preços escritos à mão. Limites do Free (`src/lib/planLimits.ts`) são só para a UI; a aplicação real acontece nas RPCs/RLS do servidor, incluindo sob pedidos concorrentes (`004_race_conditions.sql`).
- **Trial de 14 dias grátis** automático em todo o novo registo — uma tarefa `pg_cron` corre todos os dias e reverte para Free quem não fez upgrade.
- **Billing engine** (`003_billing_engine.sql` + `supabase/functions/cakto-webhook`): idempotência real por `(provider, event_id)`, ativação/renovação/cancelamento/reembolso/chargeback/pagamento recusado tratados como estados distintos — ver [`CAKTO_SETUP.md`](./CAKTO_SETUP.md).
- **Pagamentos**: Cakto no Brasil (assinatura recorrente) e Vanqir Pay em Angola (pagamento único de 30 dias — link de checkout já configurado; falta ligar a confirmação automática do pagamento, ver [`ANGOLA_PAYMENT_SETUP.md`](./ANGOLA_PAYMENT_SETUP.md)).
- **Página `/assinatura`**: estado do plano, período, valor e histórico de pagamentos do próprio utilizador (`get_my_billing_history`).
- **Painel `/admin`**: métricas de utilizadores por estado (Free/Trial/Premium/Cancelado/Expirado/Pagamento em falta) e métricas de faturação (pagamentos, renovações, reembolsos, chargebacks — sempre a partir de eventos reais, nunca estimados).
- **Emails transacionais** via Resend — `supabase/functions/welcome-email` (boas-vindas) e `supabase/functions/trial-reminder-cron` (aviso de fim de trial, disparado diariamente por `pg_cron` + `pg_net`).

Para publicar as Edge Functions num novo projeto Supabase (via [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
supabase functions deploy welcome-email --no-verify-jwt=false
supabase functions deploy trial-reminder-cron --no-verify-jwt
supabase functions deploy cakto-webhook --no-verify-jwt
```

Depois, em **Project Settings > Edge Functions > Secrets** (ou por função), define:
- `RESEND_API_KEY` — a tua chave do [Resend](https://resend.com)
- `CAKTO_WEBHOOK_SECRET` — o mesmo valor que definires no campo "Chave secreta" do webhook, no painel da Cakto
- `CRON_SECRET` — o mesmo valor guardado no Supabase Vault (ver nota abaixo)

Nenhum destes segredos fica escrito no código — todas as Edge Functions lêem-nos via `Deno.env.get(...)`.

**Nota sobre o `CRON_SECRET`:** o segredo que o `pg_cron` usa para chamar a função `trial-reminder-cron` todos os dias fica guardado encriptado no [Supabase Vault](https://supabase.com/docs/guides/database/vault) (não em texto simples na SQL). O `schema.sql` já inclui a chamada `vault.create_secret(...)` — só precisas de trocar `'SUBSTITUI-PELO-TEU-SEGREDO'` por um valor aleatório teu (ex: um UUID) antes de correr o ficheiro, e definir esse mesmo valor como secret `CRON_SECRET` da função.

## 10. O que ainda depende de ti (configuração manual)

- Criar o projeto Supabase e executar `supabase/schema.sql` (passo 1 acima) — não pode ser feito por mim sem acesso à tua conta.
- Preencher `.env.local` com as tuas próprias credenciais.
- Decidir se queres exigir confirmação de email no Supabase Auth.
- Publicar o repositório e ligar à Vercel (ou outro serviço) com as variáveis de ambiente — deploy real requer acesso à tua conta de hospedagem.
- Substituir os ícones em `public/icon-192.png`, `public/icon-512.png` e `public/apple-touch-icon.png` pela identidade visual final, se quiseres personalizar além do ícone gerado.

## 10. Preparação futura para Micro-SaaS

A arquitetura já isola por utilizador via RLS e mantém a lógica de negócio em funções puras reutilizáveis, o que facilita adicionar mais tarde: painel administrativo (nova área protegida por role) e mais gateways de pagamento — nada disto foi implementado além do que já está descrito acima, para não complicar o produto individual, conforme pedido.
