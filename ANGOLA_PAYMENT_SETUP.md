# Configuração do pagamento em Angola (Vanqir Pay)

O plano Premium em Angola custa **3.000 Kz / 30 dias** (configurado em
`src/lib/plans.ts`), pago através do Vanqir como **pagamento único sem
renovação automática** (diferente do Brasil, que é assinatura recorrente
via Cakto).

## Estado atual

✅ **Checkout configurado.** O link real já está em `src/lib/checkout.ts`
(`VANQIR_CHECKOUT_URL`), substituível via `VITE_VANQIR_CHECKOUT_URL`.

✅ **Webhook implementado** (`supabase/functions/vanqir-webhook/index.ts`),
com base na documentação oficial do Vanqir (Webhook API, consultada em
2026-09-03 em app.vanqir.com > Ferramentas > Webhook API > Ver
Documentação). Falta só publicá-lo e configurar os secrets/URL — ver
passos abaixo.

## 1. Publicar a Edge Function

```bash
supabase functions deploy vanqir-webhook --no-verify-jwt
```

## 2. Secret do Hottok (server-side apenas)

No painel do Supabase: **Edge Functions > vanqir-webhook > Secrets**, define:

```
VANQIR_WEBHOOK_HOTTOK=<o Hottok de verificação da tua conta Vanqir>
```

O Hottok está em **app.vanqir.com > Ferramentas > Webhook API >
Autenticação** — é único por conta e reutilizável em todos os produtos.

⚠️ Se já mostraste esse valor nalgum sítio (print, chat, etc.), clica em
**"Regenerar Hottok"** no painel do Vanqir antes de o colares aqui, e
atualiza o secret com o valor novo — nunca cole o Hottok em nenhum
ficheiro do frontend nem em variáveis `VITE_*`.

## 3. Configurar o webhook no painel do Vanqir

Em **app.vanqir.com > Ferramentas > Webhook API > Cadastrar Webhook**:

- **Seleccionar um produto**: FinançasPro Premium
- **URL para envio de dados**:
  ```
  https://<TEU-PROJETO>.supabase.co/functions/v1/vanqir-webhook
  ```
  (nunca a URL do site Netlify — o webhook é entre o Vanqir e o
  Supabase, não passa pelo frontend)
- **Versão**: 2.0.0 (recomendado)
- **Eventos para enviar**: marca pelo menos
  - ✅ Pagamento confirmado (`order.paid`)
  - ✅ Reembolso concluído (`order.refunded`)

  ("Produto aprovado"/"Produto rejeitado" também podem ficar marcados —
  a função regista-os para auditoria, mas não mexem em nenhuma
  subscription, porque não estão ligados a um pagamento de um cliente
  específico.)
- **Activar a integração assim que guardar**: sim

## 4. Como funciona (resumo técnico)

Segue exatamente o mesmo padrão de segurança do `cakto-webhook`:

- **Verificação da assinatura**: o header `X-Vanqir-Signature` vem no
  formato `t=<timestamp>,v1=<hmac_sha256_hex>`. A função reconstrói
  `${t}.${corpo_bruto}` e calcula o HMAC-SHA256 com o Hottok como
  chave, comparando em tempo constante — pedidos sem assinatura válida
  são rejeitados com 401, antes mesmo de o JSON ser interpretado.
- **Idempotência**: o header `X-Vanqir-Delivery` (o próprio Vanqir diz
  na documentação para o usar como chave de deduplicação — reenvia até
  3 vezes o mesmo evento em caso de falha) é a `event_id` guardada em
  `billing_events`, com a mesma constraint `UNIQUE(provider, event_id)`
  usada para a Cakto.
- **`order.paid`**: ativa/renova Premium por 30 dias. Se ainda houver
  dias por gastar do período anterior, estende a partir daí (nunca
  "perde" dias já pagos).
- **`order.refunded`**: revoga o Premium imediatamente.
- **Expiração automática**: como é pagamento único (`auto_renew=false`),
  a função `expire_non_renewing_premium()` (`supabase/schema.sql`,
  alinhada em `006_vanqir_webhook.sql`) corre todos os dias e passa
  para `plan=free, status=expired` quem passou do fim do período —
  sem apagar nenhum dado.
