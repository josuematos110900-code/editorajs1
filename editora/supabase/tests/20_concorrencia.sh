#!/usr/bin/env bash
# Teste de concorrência: 210 compras SIMULTÂNEAS de clientes diferentes.
#   - «Rios…» (pré-venda) com só 5 unidades restantes → 30 tentativas
#   - «Cartas ao Planalto» com 3 em stock           → 30 tentativas
#   - «A Sala de Aula Viva» com 40 em stock          → 150 tentativas
# Resultado esperado: exatamente 5, 3 e 40 encomendas ativas; stock/reservas no
# limite e nunca negativos; nenhum número de encomenda repetido.
#
# Uso — numa base ACABADA DE CRIAR (migrações + seed, sem outros testes antes;
# o script repõe as reservas em 145, por isso corrê-lo duas vezes vende 5 a mais)
# e com max_connections >= 220:
#   PGHOST=... PGPORT=... PGUSER=... PGDATABASE=editora_test bash supabase/tests/20_concorrencia.sh
set -euo pipefail
Q() { psql -qAt -v ON_ERROR_STOP=1 "$@"; }

Q -c "insert into auth.users select ('00000000-0000-0000-0000-'||lpad(g::text,12,'0'))::uuid, 'c'||g||'@x.ao', '{}' from generate_series(1,210) g on conflict do nothing;"
Q -c "update preorders set reserved = 145 where book_id = (select id from books where slug='rios-que-contam-historias');"

buy() {
  psql -qAt -c "select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-$(printf %012d "$1")',false);" \
    -c "set role authenticated;" \
    -c "select place_order(jsonb_build_array(jsonb_build_object('book_id',(select id from books where slug='$2'),'quantity',1)),'{\"fullName\":\"Cliente $1\",\"email\":\"c$1@x.ao\",\"phone\":\"+244 923 000 000\"}','{}','levantamento','referencia');" \
    >/dev/null 2>&1 || true
}

for i in $(seq 1 30);   do buy "$i" rios-que-contam-historias & done
for i in $(seq 31 60);  do buy "$i" cartas-ao-planalto & done
for i in $(seq 61 210); do buy "$i" a-sala-de-aula-viva & done
wait

Q -c "
with ativos as (
  select i.* from order_items i join orders o on o.id = i.order_id
  where o.status not in ('cancelado', 'reembolsado')
)
select 'rios: reservas '||reserved||'/'||unit_limit||' | encomendas '||(select count(*) from ativos i where i.book_id = p.book_id)
  ||case when reserved = 150 and (select count(*) from ativos i where i.book_id = p.book_id) = 5 then ' | OK' else ' | FALHA' end
  from preorders p join books b on b.id = p.book_id where b.slug = 'rios-que-contam-historias'
union all
select b.slug||': stock '||b.stock||' | encomendas '||count(i.id)
  ||case when b.stock = 0 and count(i.id) = case b.slug when 'cartas-ao-planalto' then 3 else 40 end then ' | OK' else ' | FALHA' end
  from books b left join ativos i on i.book_id = b.id
  where b.slug in ('cartas-ao-planalto', 'a-sala-de-aula-viva') group by b.id
union all
select 'números repetidos: '||(count(*) - count(distinct number))||case when count(*) = count(distinct number) then ' | OK' else ' | FALHA' end from orders;"
