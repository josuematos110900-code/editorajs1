import type {
  Author,
  Book,
  BookFormat,
  Category,
  DigitalFile,
  DigitalKind,
  LibraryItem,
  NewsletterSubscriber,
  Order,
  OrderStatus,
  PaymentStatus,
  Preorder,
  Profile,
} from '../types';
import type { CheckoutInput } from '../lib/validation';

export interface Catalog {
  books: Book[];
  authors: Author[];
  categories: Category[];
  preorders: Preorder[];
  /** Ficheiros das edições digitais (metadados; o conteúdo é privado). */
  digitalFiles: DigitalFile[];
}

export type PlaceOrderInput = Omit<CheckoutInput, 'acceptTerms'>;

export interface BookInput {
  id?: string;
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
  publicationDate: string | null;
  formats: BookFormat[];
  price: number;
  compareAtPrice: number | null;
  stock: number;
  ebookPrice: number | null;
  audiobookPrice: number | null;
  audiobookNarrator: string | null;
  audiobookMinutes: number | null;
  coverUrl: string | null;
  gallery: string[];
  coverColor: string;
  published: boolean;
}

export interface AuthorInput {
  id?: string;
  slug: string;
  name: string;
  bio: string;
  photoUrl: string | null;
}

export type PreorderInput = Omit<Preorder, 'id' | 'reserved'> & { id?: string };

export interface CustomerSummary extends Profile {
  orders: number;
  spent: number;
}

/** Erro com mensagem já pronta a mostrar ao utilizador (nunca detalhes internos). */
export class ApiError extends Error {}

/**
 * Contrato único de acesso a dados. A interface nunca fala diretamente com o
 * Supabase — assim o modo demonstração e a produção partilham todas as páginas.
 */
export interface Api {
  mode: 'supabase' | 'demo';

  getCatalog(): Promise<Catalog>;
  subscribeNewsletter(email: string): Promise<void>;

  getCurrentProfile(): Promise<Profile | null>;
  onAuthChange(callback: () => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, fullName: string): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  updateProfile(input: { fullName: string; phone: string }): Promise<Profile>;

  placeOrder(input: PlaceOrderInput): Promise<Order>;
  startOnlinePayment(orderId: string): Promise<{ redirectUrl: string }>;
  cancelMyOrder(orderId: string): Promise<void>;
  listMyOrders(): Promise<Order[]>;
  getMyOrder(orderId: string): Promise<Order | null>;
  /** Edições digitais compradas e pagas pelo cliente. */
  listMyLibrary(): Promise<LibraryItem[]>;
  /** Link temporário para ler/ouvir/descarregar um ficheiro já comprado. */
  getDigitalFileUrl(fileId: string): Promise<string>;

  admin: {
    getCatalog(): Promise<Catalog>;
    saveBook(input: BookInput): Promise<Book>;
    deleteBook(id: string): Promise<void>;
    saveAuthor(input: AuthorInput): Promise<Author>;
    deleteAuthor(id: string): Promise<void>;
    savePreorder(input: PreorderInput): Promise<void>;
    deletePreorder(id: string): Promise<void>;
    listOrders(): Promise<Order[]>;
    updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
    setPaymentStatus(orderId: string, status: PaymentStatus): Promise<void>;
    listCustomers(): Promise<CustomerSummary[]>;
    listSubscribers(): Promise<NewsletterSubscriber[]>;
    uploadImage(file: File, folder: 'covers' | 'authors'): Promise<string>;
    uploadDigitalFile(bookId: string, kind: DigitalKind, file: File, title: string): Promise<DigitalFile>;
    deleteDigitalFile(fileId: string): Promise<void>;
    renameDigitalFile(fileId: string, title: string, position: number): Promise<void>;
  };
}
