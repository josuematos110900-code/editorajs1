-- Apaga o conteúdo de DEMONSTRAÇÃO (livros, autores e pré-vendas com is_demo = true).
-- Executar UMA vez no SQL Editor do Supabase, antes de abrir o site ao público.
-- Os livros e autores que registou pelo painel NÃO são afetados (is_demo = false).
-- Se algum livro de demonstração já tiver encomendas, esse livro é mantido
-- (a base de dados protege o histórico de encomendas) e é apenas despublicado.

begin;

delete from public.preorders
where book_id in (select id from public.books where is_demo);

update public.books set published = false
where is_demo and exists (select 1 from public.order_items i where i.book_id = books.id);

delete from public.books b
where b.is_demo and not exists (select 1 from public.order_items i where i.book_id = b.id);

delete from public.authors a
where a.is_demo and not exists (select 1 from public.books b where b.author_id = a.id);

commit;

-- Confirmação: devem aparecer só os seus livros.
select title, published, is_demo from public.books order by title;
