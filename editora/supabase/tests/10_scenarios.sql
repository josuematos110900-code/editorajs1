\set ON_ERROR_STOP 1
-- utilizadores: A e B clientes, C admin
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a','a@x.ao','{"full_name":"Ana"}'),
 ('00000000-0000-0000-0000-00000000000b','b@x.ao','{"full_name":"Beto"}'),
 ('00000000-0000-0000-0000-00000000000c','c@x.ao','{"full_name":"Admin"}');
update profiles set role='admin' where email='c@x.ao';
select 'profiles criados pelo trigger', count(*) = 3 from profiles;

create function as_user(uid text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', uid, false); end $$;
grant execute on function as_user(text) to authenticated, anon;

-- 1. anónimo só vê livros publicados
set role anon;
select '1 anon vê 7 publicados', count(*) = 7 from books;
reset role;

-- 2. cliente A faz encomenda (2 pré-venda + 1 em stock) com entrega Luanda
select as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
create temp table t_order as select place_order(
  jsonb_build_array(
    jsonb_build_object('book_id',(select id from books where slug='o-segredo-da-ultima-noite'),'quantity',2),
    jsonb_build_object('book_id',(select id from books where slug='a-sala-de-aula-viva'),'quantity',1)),
  '{"fullName":"Ana Exemplo","email":"a@x.ao","phone":"+244 923 000 000"}',
  '{"country":"Angola","city":"Luanda","line1":"Rua Exemplo 10, Maianga"}',
  'luanda','referencia') as id;
reset role;
select '2 totais: subtotal/desconto/portes/total',
  subtotal = 2*14500+9500 and discount = 2*(14500-11900) and shipping_cost = 0 and total = 2*11900+9500
  from orders where id = (select id from t_order);
select '2 reservas +2', reserved = 216 from preorders p join books b on b.id=p.book_id where b.slug='o-segredo-da-ultima-noite';
select '2 stock -1', stock = 39 from books where slug='a-sala-de-aula-viva';
select '2 pagamento pendente', status='pendente' and amount=(select total from orders where id=(select id from t_order)) from payments where order_id=(select id from t_order);

-- 3. B não vê a encomenda de A nem os itens/pagamentos
select as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select '3 B não vê encomendas de A', (select count(*) from orders) = 0 and (select count(*) from order_items) = 0 and (select count(*) from payments) = 0 and (select count(*) from addresses) = 0;
-- 4. B não pode cancelar a encomenda de A nem usar funções de admin
do $$ begin perform cancel_my_order((select id from t_order)); raise exception 'devia falhar'; exception when others then if sqlerrm = 'devia falhar' then raise; end if; end $$;
do $$ begin perform admin_update_order_status((select id from t_order), 'pagamento_confirmado'); raise exception 'devia falhar'; exception when others then if sqlerrm = 'devia falhar' then raise; end if; end $$;
do $$ begin perform apply_payment_event('gateway','e1','X','aprovado',1,null,'{}'); raise exception 'devia falhar'; exception when insufficient_privilege then null; end $$;
select '4 B bloqueado em cancelar/admin/webhook', true;
-- 5. cliente não pode promover-se a admin nem mexer em reservas/stock/preços
do $$ begin update profiles set role='admin' where id = auth.uid(); raise exception 'devia falhar'; exception when insufficient_privilege then null; end $$;
update books set price = 1 where slug='a-sala-de-aula-viva';
update preorders set enabled = false;
reset role;
select '5 sem escalada de privilégios', (select role from profiles where email='b@x.ao')='customer' and (select price from books where slug='a-sala-de-aula-viva')=9500 and (select bool_and(enabled) from preorders);

-- 6. sobre-reserva recusada (rios: limite 150; simulamos 145 reservadas → restam 5)
update preorders set reserved = 145 where book_id = (select id from books where slug='rios-que-contam-historias');
select as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$ begin
  perform place_order(jsonb_build_array(jsonb_build_object('book_id',(select id from books where slug='rios-que-contam-historias'),'quantity',4),
                                        jsonb_build_object('book_id',(select id from books where slug='rios-que-contam-historias'),'quantity',2)),
    '{"fullName":"Beto B","email":"b@x.ao","phone":"+244 923 000 001"}','{}','levantamento','referencia');
  raise exception 'devia falhar';
exception when others then if sqlerrm not like 'Restam apenas 5%' then raise; end if; end $$;
-- livro não publicado e livro esgotado recusados; nenhuma encomenda parcial fica criada
do $$ begin
  perform place_order(jsonb_build_array(jsonb_build_object('book_id',(select id from books where slug='a-sala-de-aula-viva'),'quantity',1),
                                        jsonb_build_object('book_id',(select id from books where slug='provincias-e-memoria'),'quantity',1)),
    '{"fullName":"Beto B","email":"b@x.ao","phone":"+244 923 000 001"}','{}','levantamento','referencia');
  raise exception 'devia falhar';
exception when others then if sqlerrm not like 'Restam apenas 0%' then raise; end if; end $$;
-- morada obrigatória
do $$ begin
  perform place_order(jsonb_build_array(jsonb_build_object('book_id',(select id from books where slug='a-sala-de-aula-viva'),'quantity',1)),
    '{"fullName":"Beto B","email":"b@x.ao","phone":"+244 923 000 001"}','{}','luanda','referencia');
  raise exception 'devia falhar';
exception when others then if sqlerrm <> 'Morada de entrega incompleta.' then raise; end if; end $$;
reset role;
update preorders set reserved = 131 where book_id = (select id from books where slug='rios-que-contam-historias');
select '6 recusas atómicas (sem encomendas/stock alterado)', (select count(*) from orders)=1 and (select stock from books where slug='a-sala-de-aula-viva')=39 and (select reserved from preorders p join books b on b.id=p.book_id where slug='rios-que-contam-historias')=131;

-- 7. webhook: valor divergente não confirma; aprovado confirma; repetido é idempotente; recusado atrasado não desfaz
set role service_role;
select '7a valor divergente', apply_payment_event('gateway','evt-1',(select number from orders limit 1),'aprovado',1,'tx1','{}') = 'valor_divergente';
select '7b aprovado', apply_payment_event('gateway','evt-2',(select number from orders limit 1),'aprovado',(select total from orders limit 1),'tx1','{}') = 'aplicado';
select '7c duplicado', apply_payment_event('gateway','evt-2',(select number from orders limit 1),'aprovado',(select total from orders limit 1),'tx1','{}') = 'duplicado';
select '7d recusado atrasado', apply_payment_event('gateway','evt-3',(select number from orders limit 1),'recusado',null,null,'{}') = 'aplicado';
reset role;
select '7 estado final', o.status='pagamento_confirmado' and p.status='aprovado' and p.provider_reference='tx1' from orders o join payments p on p.order_id=o.id;

-- 8. admin: transições válidas, inválidas recusadas, reembolso repõe stock/reservas
select as_user('00000000-0000-0000-0000-00000000000c');
set role authenticated;
do $$ begin perform admin_update_order_status((select id from orders limit 1), 'entregue'); raise exception 'devia falhar'; exception when others then if sqlerrm <> 'Mudança de estado não permitida.' then raise; end if; end $$;
select admin_update_order_status((select id from orders limit 1), 'em_preparacao');
select admin_update_order_status((select id from orders limit 1), 'enviado');
select '8 admin vê tudo', (select count(*) from orders)=1 and (select count(*) from admin_customers())=3;
select admin_update_order_status((select id from orders limit 1), 'reembolsado');
reset role;
select '8 reembolso repõe stock e reservas', (select stock from books where slug='a-sala-de-aula-viva')=40 and (select reserved from preorders p join books b on b.id=p.book_id where slug='o-segredo-da-ultima-noite')=214 and (select status from payments)='reembolsado';

-- 9. cliente cancela encomenda pendente → reservas libertadas
select as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
create temp table t2 as select place_order(jsonb_build_array(jsonb_build_object('book_id',(select id from books where slug='rios-que-contam-historias'),'quantity',3)),
    '{"fullName":"Beto B","email":"b@x.ao","phone":"+244 923 000 001"}','{}','levantamento','transferencia') as id;
select cancel_my_order((select id from t2));
reset role;
select '9 cancelamento liberta reservas', (select reserved from preorders p join books b on b.id=p.book_id where slug='rios-que-contam-historias')=131 and (select status from orders where id=(select id from t2))='cancelado';

-- 10. newsletter pública, sem leitura por anónimos
set role anon;
select subscribe_newsletter('Leitor@Exemplo.ao');
select subscribe_newsletter('leitor@exemplo.ao');
select '10 anon não lê subscritores', count(*)=0 from newsletter_subscribers;
reset role;
select '10 subscrição única e normalizada', count(*)=1 from newsletter_subscribers where email='leitor@exemplo.ao';
