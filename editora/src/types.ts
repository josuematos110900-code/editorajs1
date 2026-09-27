// Modelo de domínio partilhado entre a interface, a camada de dados e os
// testes. Espelha as tabelas em supabase/migrations/001_editora_schema.sql.

export type Role = 'customer' | 'admin';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  createdAt: string;
}

export interface Address {
  country: string;
  city: string;
  line1: string;
  line2?: string;
  postalCode?: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
}

export interface Author {
  id: string;
  slug: string;
  name: string;
  bio: string;
  photoUrl: string | null;
  isDemo: boolean;
}

export type BookFormat = 'capa_mole' | 'capa_dura' | 'ebook';

/** Edição vendida: o livro físico ou uma das edições digitais. */
export type Edition = 'fisico' | 'ebook' | 'audiolivro';
export type DigitalKind = Exclude<Edition, 'fisico'>;

/** Ficheiro de uma edição digital (PDF/EPUB do e-book, ou faixa do audiolivro). */
export interface DigitalFile {
  id: string;
  bookId: string;
  kind: DigitalKind;
  title: string;
  position: number;
  mimeType: string;
  sizeBytes: number | null;
  /** Caminho no armazenamento privado. Só quem comprou consegue obter um link. */
  storagePath: string;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  authorId: string;
  categoryId: string | null;
  synopsis: string;
  description: string;
  pages: number | null;
  isbn: string | null;
  language: string;
  publisher: string;
  publicationDate: string | null; // AAAA-MM-DD
  formats: BookFormat[];
  /** Preço em unidades inteiras da moeda (ex.: Kz), nunca em float. */
  price: number;
  compareAtPrice: number | null;
  stock: number;
  /** Preço do e-book (null = não há e-book à venda). */
  ebookPrice: number | null;
  /** Preço do audiolivro (null = não há audiolivro à venda). */
  audiobookPrice: number | null;
  audiobookNarrator: string | null;
  audiobookMinutes: number | null;
  coverUrl: string | null;
  gallery: string[];
  /** Cor base da capa gerada quando não existe imagem (modo demonstração). */
  coverColor: string;
  published: boolean;
  isDemo: boolean;
  createdAt: string;
}

export interface Preorder {
  id: string;
  bookId: string;
  enabled: boolean;
  startsAt: string; // ISO
  endsAt: string; // ISO
  /** Limite de unidades; null = sem limite. */
  unitLimit: number | null;
  specialPrice: number;
  expectedShipDate: string | null; // AAAA-MM-DD
  benefits: string[];
  /** Unidades já reservadas em encomendas ativas (calculado). */
  reserved: number;
}

export type PreorderState = 'em_breve' | 'aberta' | 'encerrada' | 'esgotada';

export type OrderStatus =
  | 'pendente'
  | 'pagamento_confirmado'
  | 'em_preparacao'
  | 'enviado'
  | 'entregue'
  | 'cancelado'
  | 'reembolsado';

export type PaymentStatus = 'pendente' | 'aprovado' | 'recusado' | 'cancelado' | 'reembolsado';

export interface OrderItem {
  id: string;
  bookId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  /** Preço de capa no momento da compra (para mostrar a poupança). */
  listPrice: number;
  isPreorder: boolean;
  edition: Edition;
}

export interface Payment {
  id: string;
  method: string;
  status: PaymentStatus;
  amount: number;
  providerReference: string | null;
  updatedAt: string;
}

export interface Order {
  id: string;
  number: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Address;
  deliveryMethod: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  status: OrderStatus;
  payment: Payment;
  createdAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  createdAt: string;
}

export interface CartLine {
  bookId: string;
  edition: Edition;
  quantity: number;
}

/** Livro digital comprado, na biblioteca do cliente. */
export interface LibraryItem {
  bookId: string;
  kind: DigitalKind;
  purchasedAt: string;
  orderNumber: string;
}
