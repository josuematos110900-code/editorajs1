// CONTEÚDO DE DEMONSTRAÇÃO — autores, livros, ISBNs e contas são fictícios.
// Os ISBNs usam o prefixo 000 (inexistente), para nunca coincidirem com
// um ISBN real. Nada disto deve ir para produção: em Supabase, o seed
// equivalente está em supabase/seed.sql e marca tudo com is_demo = true.

import type { Author, Book, Category, DigitalFile, Preorder } from '../types';

const DAY = 86_400_000;

function isoFromNow(days: number, now: number): string {
  return new Date(now + days * DAY).toISOString();
}

function dateFromNow(days: number, now: number): string {
  return new Date(now + days * DAY).toISOString().slice(0, 10);
}

export const demoCategories: Category[] = [
  { id: 'cat-romance', slug: 'romance', name: 'Romance' },
  { id: 'cat-historia', slug: 'historia', name: 'História' },
  { id: 'cat-educacao', slug: 'educacao', name: 'Educação' },
  { id: 'cat-poesia', slug: 'poesia', name: 'Poesia' },
  { id: 'cat-infantil', slug: 'infantil', name: 'Infantil' },
  { id: 'cat-ensaio', slug: 'ensaio', name: 'Ensaio' },
];

export const demoAuthors: Author[] = [
  {
    id: 'aut-luena',
    slug: 'luena-cassoma',
    name: 'Luena Cassoma',
    bio: 'Romancista nascida no Huambo. Escreve sobre famílias, silêncios e as cidades que mudam mais depressa do que as pessoas. (Autora fictícia — demonstração.)',
    photoUrl: null,
    isDemo: true,
  },
  {
    id: 'aut-tomas',
    slug: 'tomas-quissanga',
    name: 'Tomás Quissanga',
    bio: 'Historiador e professor. Dedica-se à história local e à forma como os territórios se contam a si próprios. (Autor fictício — demonstração.)',
    photoUrl: null,
    isDemo: true,
  },
  {
    id: 'aut-irene',
    slug: 'irene-mbala',
    name: 'Irene Mbala',
    bio: 'Formadora de professores e autora de materiais pedagógicos para o ensino primário. (Autora fictícia — demonstração.)',
    photoUrl: null,
    isDemo: true,
  },
  {
    id: 'aut-ndalu',
    slug: 'ndalu-kiala',
    name: 'Ndalu Kiala',
    bio: 'Poeta e contador de histórias. Escreve para adultos que não esqueceram como se lê em voz alta. (Autor fictício — demonstração.)',
    photoUrl: null,
    isDemo: true,
  },
];

type DigitalFields = 'ebookPrice' | 'audiobookPrice' | 'audiobookNarrator' | 'audiobookMinutes';

interface SeedBook extends Omit<Book, 'createdAt' | 'publicationDate' | DigitalFields>, Partial<Pick<Book, DigitalFields>> {
  publishedInDays: number;
}

const seedBooks: SeedBook[] = [
  {
    id: 'bk-segredo',
    slug: 'o-segredo-da-ultima-noite',
    title: 'O Segredo da Última Noite',
    subtitle: 'Romance',
    authorId: 'aut-luena',
    categoryId: 'cat-romance',
    synopsis:
      'Na véspera da demolição do velho prédio da Mutamba, cinco vizinhos reúnem-se pela última vez. Ao amanhecer, um deles terá desaparecido — e com ele a verdade sobre o que aconteceu em 1992.',
    description:
      'Um romance coral sobre memória, pertença e as histórias que uma cidade prefere esquecer. Luena Cassoma constrói, noite adentro, um retrato íntimo de Luanda através das vozes de quem a habitou.',
    pages: 312,
    isbn: '000-0-00000-001-0',
    language: 'Português',
    publisher: 'Editora Núcleo Digital',
    publishedInDays: 40,
    formats: ['capa_mole', 'capa_dura'],
    price: 14500,
    compareAtPrice: null,
    stock: 0,
    coverUrl: null,
    gallery: [],
    coverColor: '#8C2F1B',
    published: true,
    isDemo: true,
  },
  {
    id: 'bk-rios',
    slug: 'rios-que-contam-historias',
    title: 'Rios que Contam Histórias',
    subtitle: 'Territórios, fronteiras e memória local',
    authorId: 'aut-tomas',
    categoryId: 'cat-historia',
    synopsis:
      'Uma viagem pelos rios que desenharam províncias, municípios e comunidades — e pelo modo como a história local pode entrar na sala de aula.',
    description:
      'Obra de divulgação com mapas, cronologias e propostas didáticas. Pensada para professores, estudantes e leitores curiosos pela história do seu próprio território.',
    pages: 248,
    isbn: '000-0-00000-002-7',
    language: 'Português',
    publisher: 'Editora Núcleo Digital',
    publishedInDays: 25,
    formats: ['capa_mole'],
    price: 12000,
    compareAtPrice: null,
    stock: 0,
    coverUrl: null,
    gallery: [],
    coverColor: '#1F4A36',
    published: true,
    isDemo: true,
  },
  {
    id: 'bk-sala',
    slug: 'a-sala-de-aula-viva',
    title: 'A Sala de Aula Viva',
    subtitle: 'Práticas para o ensino primário',
    authorId: 'aut-irene',
    categoryId: 'cat-educacao',
    synopsis:
      '60 atividades testadas em turmas reais para tornar cada aula mais participativa, com fichas fotocopiáveis e grelhas de avaliação.',
    description:
      'Um guia prático para professores do 1.º ao 6.º ano, organizado por trimestre e por competência, com sugestões de adaptação para turmas numerosas.',
    pages: 186,
    isbn: '000-0-00000-003-4',
    language: 'Português',
    publisher: 'Editora Núcleo Digital',
    publishedInDays: -120,
    formats: ['capa_mole'],
    price: 9500,
    compareAtPrice: 11000,
    stock: 40,
    ebookPrice: 5900,
    coverUrl: null,
    gallery: [],
    coverColor: '#B8923A',
    published: true,
    isDemo: true,
  },
  {
    id: 'bk-cartas',
    slug: 'cartas-ao-planalto',
    title: 'Cartas ao Planalto',
    subtitle: 'Poemas',
    authorId: 'aut-ndalu',
    categoryId: 'cat-poesia',
    synopsis: 'Quarenta poemas escritos em trânsito, entre a costa e o planalto, sobre as distâncias que nos fazem.',
    description: 'A primeira recolha de poesia de Ndalu Kiala, em edição cuidada com papel de alta gramagem.',
    pages: 96,
    isbn: '000-0-00000-004-1',
    language: 'Português',
    publisher: 'Editora Núcleo Digital',
    publishedInDays: -60,
    formats: ['capa_dura'],
    price: 8000,
    compareAtPrice: null,
    stock: 3,
    audiobookPrice: 4500,
    audiobookNarrator: 'O autor (demonstração)',
    audiobookMinutes: 58,
    coverUrl: null,
    gallery: [],
    coverColor: '#2A2723',
    published: true,
    isDemo: true,
  },
  {
    id: 'bk-imbondeiro',
    slug: 'o-pequeno-imbondeiro',
    title: 'O Pequeno Imbondeiro',
    subtitle: 'Uma história para ler em voz alta',
    authorId: 'aut-ndalu',
    categoryId: 'cat-infantil',
    synopsis: 'O mais pequeno imbondeiro da savana quer crescer depressa. A avó-árvore ensina-lhe que as raízes vêm primeiro.',
    description: 'Livro ilustrado para crianças dos 4 aos 8 anos, com guia de leitura para pais e educadores.',
    pages: 40,
    isbn: '000-0-00000-005-8',
    language: 'Português',
    publisher: 'Editora Núcleo Digital',
    publishedInDays: 75,
    formats: ['capa_dura'],
    price: 7500,
    compareAtPrice: null,
    stock: 0,
    coverUrl: null,
    gallery: [],
    coverColor: '#357A5B',
    published: true,
    isDemo: true,
  },
  {
    id: 'bk-provincias',
    slug: 'provincias-e-memoria',
    title: 'Províncias e Memória',
    subtitle: 'Ensaios sobre a divisão político-administrativa',
    authorId: 'aut-tomas',
    categoryId: 'cat-ensaio',
    synopsis: 'Como se desenham fronteiras internas — e o que elas mudam na forma como ensinamos e vivemos a história local.',
    description: 'Seis ensaios que cruzam história, governação local e educação.',
    pages: 204,
    isbn: '000-0-00000-006-5',
    language: 'Português',
    publisher: 'Editora Núcleo Digital',
    publishedInDays: -200,
    formats: ['capa_mole'],
    price: 11000,
    compareAtPrice: null,
    stock: 0,
    coverUrl: null,
    gallery: [],
    coverColor: '#4A150C',
    published: true,
    isDemo: true,
  },
  {
    id: 'bk-mares',
    slug: 'mares-de-benguela',
    title: 'Marés de Benguela',
    subtitle: null,
    authorId: 'aut-luena',
    categoryId: 'cat-romance',
    synopsis: 'Uma pescadora, um engenheiro e um verão que muda a baía para sempre.',
    description: 'O romance de estreia de Luena Cassoma, agora em nova edição revista.',
    pages: 268,
    isbn: '000-0-00000-007-2',
    language: 'Português',
    publisher: 'Editora Núcleo Digital',
    publishedInDays: -400,
    formats: ['capa_mole'],
    price: 10500,
    compareAtPrice: null,
    stock: 25,
    ebookPrice: 6500,
    audiobookPrice: 7900,
    audiobookNarrator: 'Narradora de demonstração',
    audiobookMinutes: 412,
    coverUrl: null,
    gallery: [],
    coverColor: '#3D5A80',
    published: true,
    isDemo: true,
  },
  {
    id: 'bk-mapas',
    slug: 'mapas-do-tempo',
    title: 'Mapas do Tempo',
    subtitle: 'Rascunho',
    authorId: 'aut-tomas',
    categoryId: 'cat-historia',
    synopsis: 'Livro em preparação — visível apenas no painel administrativo.',
    description: '',
    pages: null,
    isbn: null,
    language: 'Português',
    publisher: 'Editora Núcleo Digital',
    publishedInDays: 180,
    formats: ['capa_mole'],
    price: 13000,
    compareAtPrice: null,
    stock: 0,
    coverUrl: null,
    gallery: [],
    coverColor: '#57524A',
    published: false,
    isDemo: true,
  },
];

export function buildDemoCatalog(now: number = Date.now()) {
  const books: Book[] = seedBooks.map(({ publishedInDays, ...book }) => ({
    ebookPrice: null,
    audiobookPrice: null,
    audiobookNarrator: null,
    audiobookMinutes: null,
    ...book,
    publicationDate: dateFromNow(publishedInDays, now),
    createdAt: isoFromNow(-30, now),
  }));

  const preorders: Preorder[] = [
    {
      id: 'pre-segredo',
      bookId: 'bk-segredo',
      enabled: true,
      startsAt: isoFromNow(-10, now),
      endsAt: isoFromNow(30, now),
      unitLimit: 500,
      specialPrice: 11900,
      expectedShipDate: dateFromNow(38, now),
      benefits: ['Preço especial de pré-venda', 'Exemplar assinado pela autora', 'Marcador exclusivo da edição'],
      reserved: 214,
    },
    {
      id: 'pre-rios',
      bookId: 'bk-rios',
      enabled: true,
      startsAt: isoFromNow(-20, now),
      endsAt: isoFromNow(9, now),
      unitLimit: 150,
      specialPrice: 9900,
      expectedShipDate: dateFromNow(23, now),
      benefits: ['Preço especial de pré-venda', 'Mapa desdobrável em tamanho A2', 'Acesso às fichas didáticas digitais'],
      reserved: 131,
    },
    {
      id: 'pre-imbondeiro',
      bookId: 'bk-imbondeiro',
      enabled: true,
      startsAt: isoFromNow(5, now),
      endsAt: isoFromNow(60, now),
      unitLimit: null,
      specialPrice: 6500,
      expectedShipDate: dateFromNow(70, now),
      benefits: ['Preço especial de pré-venda', 'Autocolantes para colorir'],
      reserved: 0,
    },
  ];

  return { books, authors: demoAuthors, categories: demoCategories, preorders, digitalFiles: demoDigitalFiles };
}

// Ficheiros digitais de DEMONSTRAÇÃO: um PDF de uma página e faixas de áudio
// de 1 segundo em silêncio, gerados aqui — só para se poder testar a compra e
// a biblioteca sem Supabase. Os ficheiros reais carregam-se pelo painel.
const DEMO_PDF =
  'data:application/pdf;base64,' +
  btoa(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj ' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj ' +
      '4 0 obj<</Length 58>>stream\nBT /F1 14 Tf 30 100 Td (E-book de demonstracao) Tj ET\nendstream endobj ' +
      '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
  );

function silentWav(seconds = 1, rate = 8000): string {
  const samples = seconds * rate;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const ascii = (o: number, t: string) => [...t].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  ascii(0, 'RIFF'); view.setUint32(4, 36 + samples, true); ascii(8, 'WAVE'); ascii(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
  ascii(36, 'data'); view.setUint32(40, samples, true);
  bytes.fill(128, 44);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return 'data:audio/wav;base64,' + btoa(bin);
}

const DEMO_WAV = typeof btoa === 'function' ? silentWav() : '';

export const demoDigitalFiles: DigitalFile[] = [
  { id: 'df-sala-pdf', bookId: 'bk-sala', kind: 'ebook', title: 'A Sala de Aula Viva (PDF)', position: 1, mimeType: 'application/pdf', sizeBytes: 600, storagePath: DEMO_PDF },
  { id: 'df-mares-pdf', bookId: 'bk-mares', kind: 'ebook', title: 'Marés de Benguela (PDF)', position: 1, mimeType: 'application/pdf', sizeBytes: 600, storagePath: DEMO_PDF },
  { id: 'df-mares-a1', bookId: 'bk-mares', kind: 'audiolivro', title: 'Capítulo 1 — A baía', position: 1, mimeType: 'audio/wav', sizeBytes: 8044, storagePath: DEMO_WAV },
  { id: 'df-mares-a2', bookId: 'bk-mares', kind: 'audiolivro', title: 'Capítulo 2 — O verão', position: 2, mimeType: 'audio/wav', sizeBytes: 8044, storagePath: DEMO_WAV },
  { id: 'df-cartas-a1', bookId: 'bk-cartas', kind: 'audiolivro', title: 'Poemas 1–20', position: 1, mimeType: 'audio/wav', sizeBytes: 8044, storagePath: DEMO_WAV },
  { id: 'df-cartas-a2', bookId: 'bk-cartas', kind: 'audiolivro', title: 'Poemas 21–40', position: 2, mimeType: 'audio/wav', sizeBytes: 8044, storagePath: DEMO_WAV },
];
