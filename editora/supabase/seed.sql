-- CONTEÚDO DE DEMONSTRAÇÃO (gerado a partir de src/data/demoSeed.ts).
-- Autores, livros e ISBNs (prefixo 000, inexistente) são fictícios e ficam
-- marcados com is_demo = true. Para remover tudo antes de produção:
--   delete from public.books where is_demo; delete from public.authors where is_demo;
-- As datas das pré-vendas são relativas a now() para a demo funcionar sempre.
begin;
insert into public.categories (slug, name) values ('romance', 'Romance') on conflict (slug) do nothing;
insert into public.categories (slug, name) values ('historia', 'História') on conflict (slug) do nothing;
insert into public.categories (slug, name) values ('educacao', 'Educação') on conflict (slug) do nothing;
insert into public.categories (slug, name) values ('poesia', 'Poesia') on conflict (slug) do nothing;
insert into public.categories (slug, name) values ('infantil', 'Infantil') on conflict (slug) do nothing;
insert into public.categories (slug, name) values ('ensaio', 'Ensaio') on conflict (slug) do nothing;
insert into public.authors (slug, name, bio, is_demo) values ('luena-cassoma', 'Luena Cassoma', 'Romancista nascida no Huambo. Escreve sobre famílias, silêncios e as cidades que mudam mais depressa do que as pessoas. (Autora fictícia — demonstração.)', true) on conflict (slug) do nothing;
insert into public.authors (slug, name, bio, is_demo) values ('tomas-quissanga', 'Tomás Quissanga', 'Historiador e professor. Dedica-se à história local e à forma como os territórios se contam a si próprios. (Autor fictício — demonstração.)', true) on conflict (slug) do nothing;
insert into public.authors (slug, name, bio, is_demo) values ('irene-mbala', 'Irene Mbala', 'Formadora de professores e autora de materiais pedagógicos para o ensino primário. (Autora fictícia — demonstração.)', true) on conflict (slug) do nothing;
insert into public.authors (slug, name, bio, is_demo) values ('ndalu-kiala', 'Ndalu Kiala', 'Poeta e contador de histórias. Escreve para adultos que não esqueceram como se lê em voz alta. (Autor fictício — demonstração.)', true) on conflict (slug) do nothing;
insert into public.books (slug, title, subtitle, author_id, category_id, synopsis, description, pages, isbn, publisher, publication_date, formats, price, compare_at_price, stock, cover_color, published, is_demo)
values ('o-segredo-da-ultima-noite', 'O Segredo da Última Noite', 'Romance', (select id from public.authors where slug = 'luena-cassoma'), (select id from public.categories where slug = 'romance'), 'Na véspera da demolição do velho prédio da Mutamba, cinco vizinhos reúnem-se pela última vez. Ao amanhecer, um deles terá desaparecido — e com ele a verdade sobre o que aconteceu em 1992.', 'Um romance coral sobre memória, pertença e as histórias que uma cidade prefere esquecer. Luena Cassoma constrói, noite adentro, um retrato íntimo de Luanda através das vozes de quem a habitou.', 312, '000-0-00000-001-0', 'Editora Núcleo Digital', current_date + 40, array['capa_mole', 'capa_dura']::text[], 14500, null, 0, '#8C2F1B', true, true)
on conflict (slug) do nothing;
insert into public.books (slug, title, subtitle, author_id, category_id, synopsis, description, pages, isbn, publisher, publication_date, formats, price, compare_at_price, stock, cover_color, published, is_demo)
values ('rios-que-contam-historias', 'Rios que Contam Histórias', 'Territórios, fronteiras e memória local', (select id from public.authors where slug = 'tomas-quissanga'), (select id from public.categories where slug = 'historia'), 'Uma viagem pelos rios que desenharam províncias, municípios e comunidades — e pelo modo como a história local pode entrar na sala de aula.', 'Obra de divulgação com mapas, cronologias e propostas didáticas. Pensada para professores, estudantes e leitores curiosos pela história do seu próprio território.', 248, '000-0-00000-002-7', 'Editora Núcleo Digital', current_date + 25, array['capa_mole']::text[], 12000, null, 0, '#1F4A36', true, true)
on conflict (slug) do nothing;
insert into public.books (slug, title, subtitle, author_id, category_id, synopsis, description, pages, isbn, publisher, publication_date, formats, price, compare_at_price, stock, cover_color, published, is_demo)
values ('a-sala-de-aula-viva', 'A Sala de Aula Viva', 'Práticas para o ensino primário', (select id from public.authors where slug = 'irene-mbala'), (select id from public.categories where slug = 'educacao'), '60 atividades testadas em turmas reais para tornar cada aula mais participativa, com fichas fotocopiáveis e grelhas de avaliação.', 'Um guia prático para professores do 1.º ao 6.º ano, organizado por trimestre e por competência, com sugestões de adaptação para turmas numerosas.', 186, '000-0-00000-003-4', 'Editora Núcleo Digital', current_date + -120, array['capa_mole', 'ebook']::text[], 9500, 11000, 40, '#B8923A', true, true)
on conflict (slug) do nothing;
insert into public.books (slug, title, subtitle, author_id, category_id, synopsis, description, pages, isbn, publisher, publication_date, formats, price, compare_at_price, stock, cover_color, published, is_demo)
values ('cartas-ao-planalto', 'Cartas ao Planalto', 'Poemas', (select id from public.authors where slug = 'ndalu-kiala'), (select id from public.categories where slug = 'poesia'), 'Quarenta poemas escritos em trânsito, entre a costa e o planalto, sobre as distâncias que nos fazem.', 'A primeira recolha de poesia de Ndalu Kiala, em edição cuidada com papel de alta gramagem.', 96, '000-0-00000-004-1', 'Editora Núcleo Digital', current_date + -60, array['capa_dura']::text[], 8000, null, 3, '#2A2723', true, true)
on conflict (slug) do nothing;
insert into public.books (slug, title, subtitle, author_id, category_id, synopsis, description, pages, isbn, publisher, publication_date, formats, price, compare_at_price, stock, cover_color, published, is_demo)
values ('o-pequeno-imbondeiro', 'O Pequeno Imbondeiro', 'Uma história para ler em voz alta', (select id from public.authors where slug = 'ndalu-kiala'), (select id from public.categories where slug = 'infantil'), 'O mais pequeno imbondeiro da savana quer crescer depressa. A avó-árvore ensina-lhe que as raízes vêm primeiro.', 'Livro ilustrado para crianças dos 4 aos 8 anos, com guia de leitura para pais e educadores.', 40, '000-0-00000-005-8', 'Editora Núcleo Digital', current_date + 75, array['capa_dura']::text[], 7500, null, 0, '#357A5B', true, true)
on conflict (slug) do nothing;
insert into public.books (slug, title, subtitle, author_id, category_id, synopsis, description, pages, isbn, publisher, publication_date, formats, price, compare_at_price, stock, cover_color, published, is_demo)
values ('provincias-e-memoria', 'Províncias e Memória', 'Ensaios sobre a divisão político-administrativa', (select id from public.authors where slug = 'tomas-quissanga'), (select id from public.categories where slug = 'ensaio'), 'Como se desenham fronteiras internas — e o que elas mudam na forma como ensinamos e vivemos a história local.', 'Seis ensaios que cruzam história, governação local e educação.', 204, '000-0-00000-006-5', 'Editora Núcleo Digital', current_date + -200, array['capa_mole']::text[], 11000, null, 0, '#4A150C', true, true)
on conflict (slug) do nothing;
insert into public.books (slug, title, subtitle, author_id, category_id, synopsis, description, pages, isbn, publisher, publication_date, formats, price, compare_at_price, stock, cover_color, published, is_demo)
values ('mares-de-benguela', 'Marés de Benguela', null, (select id from public.authors where slug = 'luena-cassoma'), (select id from public.categories where slug = 'romance'), 'Uma pescadora, um engenheiro e um verão que muda a baía para sempre.', 'O romance de estreia de Luena Cassoma, agora em nova edição revista.', 268, '000-0-00000-007-2', 'Editora Núcleo Digital', current_date + -400, array['capa_mole', 'ebook']::text[], 10500, null, 25, '#3D5A80', true, true)
on conflict (slug) do nothing;
insert into public.books (slug, title, subtitle, author_id, category_id, synopsis, description, pages, isbn, publisher, publication_date, formats, price, compare_at_price, stock, cover_color, published, is_demo)
values ('mapas-do-tempo', 'Mapas do Tempo', 'Rascunho', (select id from public.authors where slug = 'tomas-quissanga'), (select id from public.categories where slug = 'historia'), 'Livro em preparação — visível apenas no painel administrativo.', '', null, null, 'Editora Núcleo Digital', current_date + 180, array['capa_mole']::text[], 13000, null, 0, '#57524A', false, true)
on conflict (slug) do nothing;
insert into public.preorders (book_id, enabled, starts_at, ends_at, unit_limit, special_price, expected_ship_date, benefits, reserved)
values ((select id from public.books where slug = 'o-segredo-da-ultima-noite'), true, now() + interval '-10 days', now() + interval '30 days', 500, 11900, current_date + 38, array['Preço especial de pré-venda', 'Exemplar assinado pela autora', 'Marcador exclusivo da edição']::text[], 214)
on conflict (book_id) do nothing;
insert into public.preorders (book_id, enabled, starts_at, ends_at, unit_limit, special_price, expected_ship_date, benefits, reserved)
values ((select id from public.books where slug = 'rios-que-contam-historias'), true, now() + interval '-20 days', now() + interval '9 days', 150, 9900, current_date + 23, array['Preço especial de pré-venda', 'Mapa desdobrável em tamanho A2', 'Acesso às fichas didáticas digitais']::text[], 131)
on conflict (book_id) do nothing;
insert into public.preorders (book_id, enabled, starts_at, ends_at, unit_limit, special_price, expected_ship_date, benefits, reserved)
values ((select id from public.books where slug = 'o-pequeno-imbondeiro'), true, now() + interval '5 days', now() + interval '60 days', null, 6500, current_date + 70, array['Preço especial de pré-venda', 'Autocolantes para colorir']::text[], 0)
on conflict (book_id) do nothing;
commit;
