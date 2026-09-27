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
  publisher: string;
  publicationDate: string | null; // AAAA-MM-DD
  formats: BookFormat[];
  /** Preço em unidades inteiras da moeda (ex.: Kz), nunca em float. */
  price: number;
  compareAtPrice: number | null;
  stock: number;
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
  quantity: number;
}
