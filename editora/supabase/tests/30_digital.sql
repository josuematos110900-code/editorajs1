\set ON_ERROR_STOP 1
-- Cenários das edições digitais. Correr numa base acabada de criar
-- (stub + migrações 001–004 + seed), como 10_scenarios.sql.

insert into auth.users values
 ('00000000-0000-0000-0000-0000000000d1','leitor1@x.ao','{"full_name":"Leitor Um"}'),
 ('00000000-0000-0000-0000-0000000000d2','leitor2@x.ao','{"full_name":"Leitor Dois"}'),
 ('00000000-0000-0000-0000-0000000000da','admin@x.ao','{"full_name":"Admin"}')
on conflict do nothing;
update profiles set role = 'admin' where email = 'admin@x.ao';

create or replace function as_user(uid text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', uid, false); end $$;
grant execute on function as_user(text) to authenticated, anon;

-- Ficheiros (como se o admin os tivesse carregado pelo painel).
insert into digital_files (book_id, kind, title, position, storage_path, mime_type) values
 ((select id from books where slug='mares-de-benguela'), 'ebook', 'Marés (PDF)', 1, 'mares/ebook/mares.pdf', 'application/pdf'),
 ((select id from books where slug='mares-de-benguela'), 'audiolivro', 'Capítulo 1', 1, 'mares/audio/c1.mp3', 'audio/mpeg');
insert into storage.objects (bucket_id, name) values ('digital', 'mares/ebook/mares.pdf'), ('digital', 'mares/audio/c1.mp3');

-- 1. Público vê os capítulos (metadados), mas não o conteúdo.
set role anon;
select '1 anónimo vê metadados, não ficheiros', (select count(*) from digital_files) = 2 and (select count(*) from storage.objects where bucket_id='digital') = 0;
reset role;

-- 2. Compra só digital: entrega «digital», sem portes nem morada, stock intocado.
select as_user('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
create temp table t_dig as select place_order(
  jsonb_build_array(
    jsonb_build_object('book_id',(select id from books where slug='mares-de-benguela'),'quantity',1,'edition','ebook'),
    jsonb_build_object('book_id',(select id from books where slug='mares-de-benguela'),'quantity',1,'edition','audiolivro')),
  '{"fullName":"Leitor Um","email":"leitor1@x.ao","phone":"+244 923 000 010"}', '{}', 'digital', 'transferencia') as id;
select '2 antes de pagar: sem acesso', (select count(*) from storage.objects where bucket_id='digital') = 0 and (select count(*) from my_library()) = 0;
reset role;
select '2 totais digitais', total = 6500 + 7900 and shipping_cost = 0 and address_id is null from orders where id = (select id from t_dig);
select '2 stock não mexe', stock = 25 from books where slug = 'mares-de-benguela';

-- 3. Pagamento confirmado pelo admin → entregue automaticamente → acesso.
select as_user('00000000-0000-0000-0000-0000000000da');
set role authenticated;
select admin_set_payment_status((select id from t_dig), 'aprovado');
reset role;
select '3 só digital passa a entregue', status = 'entregue' from orders where id = (select id from t_dig);
select as_user('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
select '3 dono acede aos 2 ficheiros e à biblioteca', (select count(*) from storage.objects where bucket_id='digital') = 2 and (select count(*) from my_library()) = 2;
-- 4. Não compra duas vezes.
do $$ begin
  perform place_order(jsonb_build_array(jsonb_build_object('book_id',(select id from books where slug='mares-de-benguela'),'quantity',1,'edition','ebook')),
    '{"fullName":"Leitor Um","email":"leitor1@x.ao","phone":"+244 923 000 010"}','{}','digital','transferencia');
  raise exception 'devia falhar';
exception when others then if sqlerrm not like 'Já comprou o e-book%' then raise; end if; end $$;
select '4 não compra duas vezes', true;
reset role;

-- 5. Outro cliente não acede, nem consegue ler a encomenda.
select as_user('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
select '5 outro cliente sem acesso', (select count(*) from storage.objects where bucket_id='digital') = 0 and (select count(*) from my_library()) = 0 and (select count(*) from orders) = 0;
-- 6. Regras de entrega e disponibilidade.
do $$ begin
  perform place_order(jsonb_build_array(jsonb_build_object('book_id',(select id from books where slug='mares-de-benguela'),'quantity',1,'edition','ebook')),
    '{"fullName":"Leitor Dois","email":"leitor2@x.ao","phone":"+244 923 000 011"}','{"country":"Angola","city":"Luanda","line1":"Rua Exemplo 10"}','luanda','transferencia');
  raise exception 'devia falhar';
exception when others then if sqlerrm <> 'Os livros digitais não têm entrega física.' then raise; end if; end $$;
do $$ begin
  perform place_order(jsonb_build_array(jsonb_build_object('book_id',(select id from books where slug='a-sala-de-aula-viva'),'quantity',1,'edition','ebook')),
    '{"fullName":"Leitor Dois","email":"leitor2@x.ao","phone":"+244 923 000 011"}','{}','digital','transferencia');
  raise exception 'devia falhar';
exception when others then if sqlerrm not like 'O e-book de «A Sala de Aula Viva» não está disponível.' then raise; end if; end $$;
do $$ begin
  perform place_order(jsonb_build_array(jsonb_build_object('book_id',(select id from books where slug='mares-de-benguela'),'quantity',2,'edition','audiolivro')),
    '{"fullName":"Leitor Dois","email":"leitor2@x.ao","phone":"+244 923 000 011"}','{}','digital','transferencia');
  raise exception 'devia falhar';
exception when others then if sqlerrm not like '%compra-se uma vez%' then raise; end if; end $$;
select '6 entrega errada, sem ficheiro e quantidade 2 recusados', true;

-- 7. Encomenda mista: portes só sobre o físico (9 500 < 30 000 → paga 2 500).
create temp table t_mix as select place_order(
  jsonb_build_array(
    jsonb_build_object('book_id',(select id from books where slug='a-sala-de-aula-viva'),'quantity',1),
    jsonb_build_object('book_id',(select id from books where slug='mares-de-benguela'),'quantity',1,'edition','ebook')),
  '{"fullName":"Leitor Dois","email":"leitor2@x.ao","phone":"+244 923 000 011"}',
  '{"country":"Angola","city":"Luanda","line1":"Rua Exemplo 10"}', 'luanda', 'transferencia') as id;
reset role;
select '7 mista: total e portes', total = 9500 + 6500 + 2500 and shipping_cost = 2500 from orders where id = (select id from t_mix);
select as_user('00000000-0000-0000-0000-0000000000da');
set role authenticated;
select admin_set_payment_status((select id from t_mix), 'aprovado');
reset role;
select '7 mista com físico fica em «pagamento confirmado» (há que enviar)', status = 'pagamento_confirmado' from orders where id = (select id from t_mix);

-- 8. Reembolso retira o acesso e não mexe em stock de digitais.
select as_user('00000000-0000-0000-0000-0000000000da');
set role authenticated;
select admin_update_order_status((select id from t_dig), 'reembolsado');
reset role;
select as_user('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
select '8 reembolso retira o acesso', (select count(*) from storage.objects where bucket_id='digital') = 0 and (select count(*) from my_library()) = 0;
reset role;
select '8 stock intocado pelo reembolso digital', stock = 25 from books where slug = 'mares-de-benguela';

-- 9. Cliente não consegue carregar nem apagar ficheiros digitais.
select as_user('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$ begin insert into digital_files (book_id, kind, title, storage_path, mime_type) values ((select id from books limit 1), 'ebook', 'x', 'x', 'application/pdf'); raise exception 'devia falhar';
exception when insufficient_privilege then null; end $$;
delete from digital_files;
reset role;
select '9 cliente não gere ficheiros', (select count(*) from digital_files) = 2;
