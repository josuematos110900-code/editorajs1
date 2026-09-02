# Configuração do pagamento em Angola (Vanqir Pay)

O plano Premium em Angola custa **3.000 Kz / 30 dias** (configurado em
`src/lib/plans.ts`), pago através do Vanqir Pay como **pagamento único
sem renovação automática** (diferente do Brasil, que é assinatura
recorrente via Cakto).

## Estado atual

✅ **Link de checkout configurado.** O link real já está em
`src/lib/checkout.ts` (`VANQIR_CHECKOUT_URL`) e é usado por omissão —
o botão de upgrade em Angola já abre este checkout:

```
https://pay.vanqir.com/checkout/0833edbc-2ac4-4985-a266-8c50527c7382
```

Podes substituir sem tocar em código definindo `VITE_VANQIR_CHECKOUT_URL`
(ver `.env.example`) — útil se o link mudar (ex: nova campanha/produto).

⚠️ **Ainda falta a confirmação automática do pagamento (dependência
externa).** O clique no botão só abre o checkout do Vanqir — como em
qualquer fluxo de pagamento deste projeto, **nunca ativa Premium
sozinho** (Regra 2/9). Falta ligar a confirmação real do pagamento:

- O schema já suporta este fluxo: colunas `country`, `currency`,
  `provider_customer_id`, etc. em `subscriptions`
  (`supabase/migrations/002_security_hardening.sql`), o valor
  `'vanqir'` já é aceite em `billing_provider`/`billing_events.provider`
  (`supabase/migrations/005_vanqir_provider.sql`), e a função
  `expire_non_renewing_premium()` (`supabase/schema.sql`) já expira
  automaticamente o Premium comprado sem renovação, 30 dias depois do
  pagamento — sem nunca apagar dados do utilizador.

## O que falta fazer para o pagamento ativar Premium sozinho

1. **Confirmar a documentação oficial do Vanqir Pay** (se há webhook de
   confirmação de pagamento, e o formato exato do payload/headers/
   assinatura) — este ambiente de desenvolvimento não tem acesso à
   internet para consultar essa documentação, por isso o adapter/webhook
   ainda não foi escrito. Não inventes o formato: implementa a partir
   da documentação real quando a tiveres.
2. Se o Vanqir Pay tiver webhook de confirmação: criar uma Edge
   Function `vanqir-webhook` seguindo exatamente o mesmo padrão de
   `supabase/functions/cakto-webhook/index.ts` — idempotência via
   `billing_events` (`provider = 'vanqir'`), preenchimento dos campos
   comerciais de `subscriptions`, e nunca ativar Premium a partir do
   frontend.
3. Se não houver webhook (confirmação manual): documentar o processo
   operacional (ex: um admin confirma o pagamento e ativa manualmente
   via SQL/painel admin) — nunca dar ao próprio utilizador uma forma de
   se auto-ativar Premium.

## Não fazer

- Não ativar Premium diretamente no clique do botão de checkout — só
  depois de confirmação real do pagamento (webhook ou confirmação
  manual documentada).
- Não inventar um endpoint, formato de payload ou header do Vanqir Pay
  que não estejam confirmados pela documentação oficial.
