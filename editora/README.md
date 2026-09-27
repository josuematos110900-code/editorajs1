# Editora — plataforma de pré-venda

Site de uma editora com catálogo, páginas de livro e de autor, **pré-vendas com contador e limite de unidades**, carrinho, checkout, pagamentos (manuais e online com webhook), área do cliente e painel administrativo.

Vive nesta pasta (`editora/`), separado da aplicação FinançasPro na raiz do repositório, e reutiliza a mesma stack e os mesmos padrões dessa aplicação.

| Camada | Tecnologia |
|---|---|
| Interface | React 19 + TypeScript + Vite + Tailwind CSS |
| Dados e autenticação | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Pagamentos | Edge Functions `create-payment` e `payment-webhook` (HMAC) |
| Validação | Zod (no cliente) + funções SQL (no servidor, é quem decide) |
| Testes | Vitest (lógica e webhooks) + cenários SQL (RLS e encomendas) |

## Começar em 1 minuto (modo demonstração)

```bash
cd editora
npm install
npm run dev        # http://localhost:5173
```

Sem Supabase configurado, `npm run dev` arranca em **modo demonstração**: os livros, autores e ISBNs são fictícios (prefixo `000`, que não existe) e todas as alterações ficam guardadas só neste browser.

| Conta de demonstração | E-mail | Palavra-passe |
|---|---|---|
| Leitor | `leitor@demo.local` | `demo1234` |
| Equipa (admin) | `admin@demo.local` | `demo1234` |

O painel tem um botão «Repor demo». Um build de produção **sem** Supabase não entra em modo demonstração: mostra um ecrã de «Configuração em falta», exceto com `VITE_DEMO_MODE=true`.

## Percurso do leitor

```
Home → Livro → Pré-venda → Carrinho/Checkout → Revisão → Pagamento → Confirmação → Acompanhamento
```

«Reservar agora» adiciona o livro ao carrinho e abre logo o checkout. Se a pessoa não tiver sessão iniciada, entra ou cria conta sem sair do checkout.

## Rotas

| Público | |
|---|---|
| `/` | Home: destaque da pré-venda, lançamentos, catálogo, autores, newsletter |
| `/livros`, `/livros/:slug` | Catálogo (pesquisa, filtros por género, autor e disponibilidade, ordenação) e ficha do livro |
| `/pre-venda`, `/pre-venda/:slug` | Pré-vendas agrupadas por estado e página de cada pré-venda |
| `/autores`, `/autores/:slug` | Autores |
| `/carrinho`, `/checkout` | Compra |
| `/conta`, `/encomenda/:id` | Área do cliente: encomendas, pré-vendas, dados pessoais e acompanhamento |
| `/informacoes/:slug` | Políticas (envios, pré-venda, devoluções, privacidade) |
| `/sobre`, `/contacto` | Sobre nós (texto em `site.ts > about`, a rever) e contactos |

| Administração (papel `admin`) | |
|---|---|
| `/admin` | Painel: receita, vendas, pré-vendas, encomendas, livros, autores, clientes, livros mais vendidos |
| `/admin/encomendas` | Filtros por estado, detalhe, mudança de estado, registo manual de pagamento e reembolso |
| `/admin/pre-vendas` | Abrir e fechar, início, fim, limite de unidades, preço especial, reservas |
| `/admin/livros` | Criar, editar, publicar e despublicar, eliminar, preço, stock, capa, galeria, data de lançamento, ativar pré-venda |
| `/admin/autores` | Criar, editar, fotografia, biografia, associar livros |
| `/admin/clientes`, `/admin/newsletter` | Clientes e subscritores (exportação em CSV) |

## Configuração central

Tudo o que a equipa pode querer mudar sem mexer nos componentes está em **`src/config/site.ts`**: o nome, o logótipo, a moeda, os contactos, as redes sociais, os métodos de entrega e de pagamento, os dados bancários, as políticas e os textos.

> Os contactos e os dados bancários desse ficheiro são **marcadores de demonstração**. Têm de ser substituídos antes de publicar o site.

Os custos de entrega que o servidor efetivamente cobra estão na tabela `delivery_methods`. Tem de ser mantida igual a `deliveryMethods` em `site.ts`.

## Sistema de design

A identidade visual vive em dois sítios. Mude-a aí, não nos componentes:

- **`src/index.css` (`:root`)**, com os tokens de cor:

  | Token | Uso |
  |---|---|
  | `primary` (lacre) | ações principais e pré-venda |
  | `secondary` (tinta) | ações secundárias e superfícies escuras |
  | `accent` (dourado) | destaque discreto |
  | `background` / `surface` / `surface-alt` | fundos |
  | `text` / `muted` | texto principal e secundário |
  | `border` | bordas |
  | `success` / `warning` / `danger` | estados |

  Os contrastes cumprem WCAG AA sobre o fundo de papel. No Tailwind usam-se como `bg-primary`, `text-muted`, `border-line`, etc.
- **Escala tipográfica:** `.t-display`, `.t-h1`–`.t-h4`, `.t-lead`, `.t-body`, `.t-small`, `.t-caption`, com Fraunces nos títulos e Inter no texto.
- **Ritmo:** `.page` (margens de página) e `.section` (espaço entre secções), em múltiplos de 8 px.

Os componentes partilhados são: `Button` (primary / secondary / tertiary / ghost / danger), `Badge`, `Notice` (info / success / warning / error), `Toast`, `Breadcrumb`, `Pagination`, `SectionHeader`, `BookCard` / `BookGrid`, `PreorderCard`, `AuthorCard` / `AuthorHero`, `FilterPanel`, `Countdown` e `Modal`.

As animações respeitam `prefers-reduced-motion`. As áreas de toque têm pelo menos 40–44 px e o layout foi verificado a 320, 375, 390, 768, 1024 e 1440 px.

## Produção com Supabase

1. Crie um projeto Supabase e, em **SQL Editor**, execute por esta ordem:
   - `supabase/migrations/001_editora_schema.sql`, que cria as tabelas, a RLS, as funções de encomenda e pagamento e o bucket `media`
   - `supabase/migrations/002_book_language.sql`, que acrescenta o idioma do livro
   - `supabase/migrations/003_preorder_sold_out_message.sql`, que dá uma mensagem clara quando a pré-venda esgota
   - opcionalmente, `supabase/seed.sql` (dados de demonstração marcados com `is_demo = true`)
2. Promova a primeira conta da equipa (depois de ela se registar no site):
   ```sql
   update public.profiles set role = 'admin' where email = 'equipa@editora.ao';
   ```
   O papel de admin só se atribui por SQL. A aplicação nunca o consegue alterar.
3. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_APP_URL`.
4. Em **Authentication > URL Configuration**, defina o `Site URL` e acrescente `/conta` aos Redirect URLs.
5. `npm run build` gera `dist/`. Os ficheiros `vercel.json` e `netlify.toml` já tratam das rotas da SPA, dos cabeçalhos de segurança e da cache. Na Vercel ou na Netlify, defina **`editora`** como diretório raiz.

### Variáveis de ambiente

| Variável | Onde | Pública? |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | build do site | sim (acesso controlado por RLS) |
| `VITE_APP_URL` | build do site | sim |
| `VITE_ONLINE_PAYMENTS=true` | build do site | sim (mostra o método «Pagamento online») |
| `PAYMENT_API_KEY`, `PAYMENT_API_URL` | Secrets da Edge Function `create-payment` | **não** |
| `PAYMENT_WEBHOOK_SECRET` | Secrets da Edge Function `payment-webhook` | **não** |
| `APP_URL` | Secrets de `create-payment` | não |
| `DATABASE_URL` | só na CLI e nas ferramentas de migração | **não** |

Nunca coloque segredos em variáveis `VITE_*`: tudo o que começa por `VITE_` vai parar ao JavaScript que o browser descarrega.

## Pagamentos

- **Referência e transferência** (ativos por omissão): o cliente recebe as instruções logo na confirmação. Depois, a equipa marca o pagamento como aprovado ou recusado no painel. Este fluxo funciona de ponta a ponta sem provedor externo.
- **Pagamento online** (desativado até ser configurado):
  - `create-payment` cria a sessão de checkout no provedor e devolve o URL para onde o cliente é encaminhado. Adapte só a função `createCheckoutSession()` à API do provedor escolhido.
  - `payment-webhook` valida o header `X-Payment-Signature` (HMAC-SHA256 de `t.corpo`, com tolerância de 5 minutos contra replay) e aplica o evento com `apply_payment_event`. Adapte só `_shared/paymentEvent.ts` ao formato do provedor.
  - Publicação:
    ```bash
    supabase functions deploy create-payment
    supabase functions deploy payment-webhook --no-verify-jwt
    ```

| Evento do provedor | Pagamento | Encomenda |
|---|---|---|
| `payment.pending` | Pendente | — |
| `payment.approved` | Aprovado | Pendente → Pagamento confirmado |
| `payment.declined` | Recusado | Pendente → Cancelado (stock e reservas repostos) |
| `payment.cancelled` | Cancelado | Pendente → Cancelado |
| `payment.refunded` | Reembolsado | → Reembolsado (stock e reservas repostos) |

Garantias do tratamento de webhooks:

- O mesmo evento entregue duas vezes só é aplicado uma vez.
- Um pagamento com valor diferente do total da encomenda nunca a confirma.
- Um «recusado» que chegue atrasado nunca desfaz um pagamento já aprovado.

## Estados da encomenda

`Pendente → Pagamento confirmado → Em preparação → Enviado → Entregue`, com saída possível para `Cancelado` ou `Reembolsado`. As transições permitidas estão definidas em `src/lib/orderStatus.ts` e na função `admin_update_order_status` (é a base de dados que as aplica).

## Segurança

- **RLS em todas as tabelas:**
  - O público só vê livros publicados.
  - Cada cliente só vê as suas encomendas, moradas e pagamentos.
  - `payment_events` só é acessível ao `service_role`.
- **`place_order` recalcula tudo no servidor:** preços, portes, descontos, stock e reservas.
  - Bloqueia as linhas numa ordem estável, sem overselling nem deadlocks.
  - Rejeita a encomenda por inteiro se algum livro falhar. Nunca ficam encomendas parciais.
- **O cliente só pode editar o nome e o telefone** (privilégios por coluna). Não consegue promover-se a admin nem alterar preços, stock ou reservas.
- **As mensagens de erro enviadas ao browser são sempre genéricas ou intencionais.** Os detalhes internos ficam no servidor.
- **Não se guardam dados de cartão.**
- **`?voltar=` só aceita caminhos internos**, o que evita redirecionamentos abertos.

## Testes e verificação

```bash
npm run lint
npm test            # 47 testes: pré-venda, preços, estados, validação, filtros, painel, assinatura de webhooks
npm run build
```

Cenários SQL (RLS, encomendas, sobre-reserva, webhooks, permissões e reposição de stock) contra um PostgreSQL local:

```bash
createdb editora_test
psql -d editora_test -f supabase/tests/00_supabase_stub.sql      # simula auth/storage/roles do Supabase
for f in supabase/migrations/00*.sql; do psql -d editora_test -f "$f"; done
psql -d editora_test -f supabase/seed.sql
psql -d editora_test -At -f supabase/tests/10_scenarios.sql      # cada linha deve terminar em |t
```

Teste de concorrência: 210 compras simultâneas com stock limitado. Corra-o numa base acabada de criar, com as migrações e o seed mas sem os cenários acima. O resultado esperado é exatamente 5, 3 e 40 vendas, sem nenhum exemplar vendido a mais:

```bash
PGDATABASE=editora_test bash supabase/tests/20_concorrencia.sh   # cada linha deve terminar em | OK
```

## Limitações conhecidas

- É uma SPA. Os metadados de SEO (title, description, Open Graph e JSON-LD `Book`) são definidos por página no browser. A Google indexa-os, mas as pré-visualizações de partilha em algumas redes sociais só leem HTML estático. Se isso for importante, acrescente pré-renderização (ou SSR) das rotas `/livros/*`, `/pre-venda/*` e `/autores/*`.
- O e-mail de notificação a cada mudança de estado ainda não está ligado. O ponto natural para o fazer é um trigger em `orders` ou uma Edge Function, como `welcome-email` na aplicação da raiz.
