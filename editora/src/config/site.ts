// Configuração central da editora. Tudo o que a equipa pode querer mudar
// sem mexer em componentes (nome, contactos, moeda, entrega, pagamento,
// políticas, textos) vive aqui.
//
// Os contactos abaixo são MARCADORES DE DEMONSTRAÇÃO — substituir pelos
// reais antes de publicar.

export const site = {
  name: 'Editora Núcleo Digital',
  shortName: 'Núcleo Digital',
  tagline: 'Livros que ficam.',
  description:
    'Editora angolana de livros académicos, literários e pedagógicos. Descubra lançamentos, reserve em pré-venda e receba em casa.',
  logo: '/logo.svg',
  locale: 'pt-AO',
  currency: { code: 'AOA', symbol: 'Kz' },
  contacts: {
    email: 'geral@exemplo.ao', // demonstração
    phone: '+244 900 000 000', // demonstração
    address: 'Luanda, Angola',
    hours: 'Seg–Sex, 8h00–17h00',
    manuscripts: 'originais@exemplo.ao', // demonstração
  },
  social: [
    { label: 'Facebook', href: 'https://facebook.com/' },
    { label: 'Instagram', href: 'https://instagram.com/' },
    { label: 'LinkedIn', href: 'https://linkedin.com/' },
  ],
  countries: ['Angola', 'Portugal', 'Brasil', 'Moçambique', 'Cabo Verde', 'São Tomé e Príncipe'],
  texts: {
    heroEyebrow: 'Pré-venda aberta',
    newsletterTitle: 'Primeiro a saber.',
    newsletterBody: 'Receba novidades, lançamentos e pré-vendas da nossa editora.',
  },
  // Página «Sobre nós» — TEXTO A REVER pela editora antes de publicar.
  about: {
    title: 'Publicamos livros que ficam.',
    intro:
      'Somos uma editora angolana dedicada a obras académicas, literárias, pedagógicas e institucionais. Acompanhamos cada livro desde o manuscrito até às mãos de quem o lê.',
    sections: [
      {
        title: 'O que publicamos',
        body: 'História e memória, educação, literatura e ensaio. Livros com rigor, cuidado gráfico e vontade de durar.',
      },
      {
        title: 'Como trabalhamos',
        body: 'Revisão editorial em várias etapas, ficha técnica e depósito legal, paginação e impressão acompanhadas pela nossa equipa.',
      },
      {
        title: 'Para autores',
        body: 'Recebemos propostas de publicação. Escreva-nos com uma sinopse, um capítulo de amostra e uma breve nota biográfica.',
      },
    ],
  },
} as const;

export interface DeliveryMethod {
  id: string;
  label: string;
  description: string;
  /** Custo fixo em Kz. */
  cost: number;
  /** Portes grátis a partir deste subtotal (null = nunca). */
  freeFrom: number | null;
  /** Se exige morada completa. */
  requiresAddress: boolean;
}

export const deliveryMethods: DeliveryMethod[] = [
  {
    id: 'levantamento',
    label: 'Levantamento na editora',
    description: 'Levante gratuitamente na nossa sede em Luanda.',
    cost: 0,
    freeFrom: null,
    requiresAddress: false,
  },
  {
    id: 'luanda',
    label: 'Entrega em Luanda',
    description: '1 a 3 dias úteis após o envio.',
    cost: 2500,
    freeFrom: 30000,
    requiresAddress: true,
  },
  {
    id: 'provincias',
    label: 'Outras províncias',
    description: '3 a 7 dias úteis após o envio.',
    cost: 5000,
    freeFrom: 50000,
    requiresAddress: true,
  },
  {
    id: 'internacional',
    label: 'Envio internacional',
    description: '7 a 21 dias úteis após o envio.',
    cost: 15000,
    freeFrom: null,
    requiresAddress: true,
  },
];

export interface PaymentMethodConfig {
  id: 'referencia' | 'transferencia' | 'gateway';
  label: string;
  description: string;
  /** 'manual' = confirmado pela equipa; 'online' = provedor externo + webhook. */
  kind: 'manual' | 'online';
  enabled: boolean;
}

export const paymentMethods: PaymentMethodConfig[] = [
  {
    id: 'referencia',
    label: 'Pagamento por referência',
    description: 'Pague num ATM ou no Multicaixa Express com a referência gerada.',
    kind: 'manual',
    enabled: true,
  },
  {
    id: 'transferencia',
    label: 'Transferência bancária',
    description: 'Transfira para a conta da editora e indique o número da encomenda.',
    kind: 'manual',
    enabled: true,
  },
  {
    id: 'gateway',
    label: 'Pagamento online',
    description: 'Cartão ou carteira digital através do nosso parceiro de pagamentos.',
    kind: 'online',
    // Só ativar depois de configurar PAYMENT_API_KEY / PAYMENT_API_URL na
    // Edge Function create-payment (ver editora/README.md).
    enabled: import.meta.env.VITE_ONLINE_PAYMENTS === 'true',
  },
];

/** Dados para pagamento manual — DEMONSTRAÇÃO, substituir pelos reais. */
export const bankDetails = {
  bank: 'Banco (demonstração)',
  holder: 'Editora (demonstração)',
  iban: 'AO06 0000 0000 0000 0000 0000 0',
  entity: '00000',
};

export const policies = [
  {
    slug: 'envios',
    title: 'Envios e entregas',
    body: [
      'Os livros em stock são preparados em até 2 dias úteis após a confirmação do pagamento.',
      'Os livros em pré-venda são enviados a partir da data prevista indicada em cada página. Se a encomenda juntar livros em stock e em pré-venda, é enviada quando todos estiverem disponíveis.',
      'Pode acompanhar o estado da encomenda a qualquer momento em «A minha conta».',
    ],
  },
  {
    slug: 'pre-venda',
    title: 'Política de pré-venda',
    body: [
      'A pré-venda garante a reserva de um exemplar ao preço especial indicado, enquanto a campanha estiver aberta e houver unidades disponíveis.',
      'Pode cancelar uma pré-venda até ao envio e receber o reembolso integral.',
      'Se a data de lançamento for adiada, será contactado e poderá manter ou cancelar a reserva.',
    ],
  },
  {
    slug: 'devolucoes',
    title: 'Trocas e devoluções',
    body: [
      'Tem 14 dias após a entrega para devolver um livro em estado novo.',
      'Livros com defeito de impressão são substituídos sem custos.',
    ],
  },
  {
    slug: 'privacidade',
    title: 'Privacidade',
    body: [
      'Usamos os seus dados apenas para processar encomendas, enviar comunicações que autorizou e cumprir obrigações legais.',
      'Nunca guardamos dados de cartão bancário: os pagamentos online são tratados diretamente pelo provedor de pagamentos.',
      'Pode pedir a consulta, correção ou eliminação dos seus dados a qualquer momento.',
    ],
  },
] as const;
