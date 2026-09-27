import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import type { Author, Book, BookFormat, Category, NewsletterSubscriber, Order, OrderStatus, PaymentStatus, Preorder, Profile } from '../types';
import { ApiError, type Api, type AuthorInput, type BookInput, type Catalog, type CustomerSummary, type PreorderInput } from './api';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

// ---------------------------------------------------------------------
// Linhas da base de dados (snake_case) → modelo de domínio (camelCase)
// ---------------------------------------------------------------------
interface BookRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author_id: string;
  category_id: string | null;
  synopsis: string;
  description: string;
  pages: number | null;
  isbn: string | null;
  publisher: string;
  publication_date: string | null;
  formats: string[];
  price: number;
  compare_at_price: number | null;
  stock: number;
  cover_url: string | null;
  gallery: string[];
  cover_color: string;
  published: boolean;
  is_demo: boolean;
  created_at: string;
}

interface AuthorRow {
  id: string;
  slug: string;
  name: string;
  bio: string;
  photo_url: string | null;
  is_demo: boolean;
}

interface PreorderRow {
  id: string;
  book_id: string;
  enabled: boolean;
  starts_at: string;
  ends_at: string;
  unit_limit: number | null;
  special_price: number;
  expected_ship_date: string | null;
  benefits: string[];
  reserved: number;
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'customer' | 'admin';
  created_at: string;
}

interface OrderRow {
  id: string;
  number: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_method: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  address: { country: string; city: string; line1: string; line2: string | null; postal_code: string | null } | null;
  order_items: { id: string; book_id: string; title: string; quantity: number; unit_price: number; list_price: number; is_preorder: boolean }[];
  payments:
    | { id: string; method: string; status: PaymentStatus; amount: number; provider_reference: string | null; updated_at: string }
    | { id: string; method: string; status: PaymentStatus; amount: number; provider_reference: string | null; updated_at: string }[]
    | null;
}

const ORDER_SELECT =
  'id, number, user_id, customer_name, customer_email, customer_phone, delivery_method, subtotal, shipping_cost, discount, total, status, created_at, ' +
  'address:addresses(country, city, line1, line2, postal_code), ' +
  'order_items(id, book_id, title, quantity, unit_price, list_price, is_preorder), ' +
  'payments(id, method, status, amount, provider_reference, updated_at)';

function toBook(r: BookRow): Book {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle,
    authorId: r.author_id,
    categoryId: r.category_id,
    synopsis: r.synopsis,
    description: r.description,
    pages: r.pages,
    isbn: r.isbn,
    publisher: r.publisher,
    publicationDate: r.publication_date,
    formats: r.formats as BookFormat[],
    price: r.price,
    compareAtPrice: r.compare_at_price,
    stock: r.stock,
    coverUrl: r.cover_url,
    gallery: r.gallery ?? [],
    coverColor: r.cover_color,
    published: r.published,
    isDemo: r.is_demo,
    createdAt: r.created_at,
  };
}

function fromBook(b: BookInput) {
  return {
    slug: b.slug,
    title: b.title,
    subtitle: b.subtitle,
    author_id: b.authorId,
    category_id: b.categoryId,
    synopsis: b.synopsis,
    description: b.description,
    pages: b.pages,
    isbn: b.isbn,
    publisher: b.publisher,
    publication_date: b.publicationDate,
    formats: b.formats,
    price: b.price,
    compare_at_price: b.compareAtPrice,
    stock: b.stock,
    cover_url: b.coverUrl,
    gallery: b.gallery,
    cover_color: b.coverColor,
    published: b.published,
  };
}

function toAuthor(r: AuthorRow): Author {
  return { id: r.id, slug: r.slug, name: r.name, bio: r.bio, photoUrl: r.photo_url, isDemo: r.is_demo };
}

function toPreorder(r: PreorderRow): Preorder {
  return {
    id: r.id,
    bookId: r.book_id,
    enabled: r.enabled,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    unitLimit: r.unit_limit,
    specialPrice: r.special_price,
    expectedShipDate: r.expected_ship_date,
    benefits: r.benefits ?? [],
    reserved: r.reserved,
  };
}

function toProfile(r: ProfileRow): Profile {
  return { id: r.id, email: r.email, fullName: r.full_name, phone: r.phone, role: r.role, createdAt: r.created_at };
}

function toOrder(r: OrderRow): Order {
  const payment = Array.isArray(r.payments) ? r.payments[0] : r.payments;
  return {
    id: r.id,
    number: r.number,
    userId: r.user_id,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    customerPhone: r.customer_phone,
    shippingAddress: {
      country: r.address?.country ?? '',
      city: r.address?.city ?? '',
      line1: r.address?.line1 ?? '',
      line2: r.address?.line2 ?? undefined,
      postalCode: r.address?.postal_code ?? undefined,
    },
    deliveryMethod: r.delivery_method,
    items: r.order_items.map((i) => ({
      id: i.id,
      bookId: i.book_id,
      title: i.title,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      listPrice: i.list_price,
      isPreorder: i.is_preorder,
    })),
    subtotal: r.subtotal,
    shippingCost: r.shipping_cost,
    discount: r.discount,
    total: r.total,
    status: r.status,
    payment: {
      id: payment?.id ?? '',
      method: payment?.method ?? '',
      status: payment?.status ?? 'pendente',
      amount: payment?.amount ?? r.total,
      providerReference: payment?.provider_reference ?? null,
      updatedAt: payment?.updated_at ?? r.created_at,
    },
    createdAt: r.created_at,
  };
}

/**
 * Converte erros do Supabase em mensagens seguras. As mensagens levantadas
 * de propósito nas funções SQL (códigos P0001/P0002/22023/28000/42501) já
 * estão em português e são mostradas; tudo o resto fica genérico — nunca
 * expomos detalhes internos da base de dados no browser.
 */
function fail(error: PostgrestError | { message: string; code?: string } | null, fallback = 'Ocorreu um erro. Tente novamente.'): never {
  const code = error && 'code' in error ? error.code : undefined;
  if (error && code && ['P0001', 'P0002', '22023', '28000', '42501'].includes(code)) throw new ApiError(error.message);
  if (code === '23505') throw new ApiError('Já existe um registo com este URL (slug).');
  if (code === '23503') throw new ApiError('Não é possível eliminar: existem registos associados.');
  if (error) console.error(error);
  throw new ApiError(fallback);
}

function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou palavra-passe incorretos.',
    'User already registered': 'Já existe uma conta com este e-mail.',
    'Email not confirmed': 'Confirme o seu e-mail antes de entrar.',
    'Password should be at least 6 characters': 'A palavra-passe deve ter pelo menos 6 caracteres.',
  };
  return map[message] ?? 'Não foi possível concluir o pedido. Tente novamente.';
}

async function loadCatalog(client: SupabaseClient): Promise<Catalog> {
  const [books, authors, categories, preorders] = await Promise.all([
    client.from('books').select('*').order('publication_date', { ascending: false }),
    client.from('authors').select('id, slug, name, bio, photo_url, is_demo').order('name'),
    client.from('categories').select('id, slug, name').order('name'),
    client.from('preorders').select('*'),
  ]);
  const error = books.error ?? authors.error ?? categories.error ?? preorders.error;
  if (error) fail(error, 'Não foi possível carregar o catálogo.');
  return {
    books: (books.data as BookRow[]).map(toBook),
    authors: (authors.data as AuthorRow[]).map(toAuthor),
    categories: categories.data as Category[],
    preorders: (preorders.data as PreorderRow[]).map(toPreorder),
  };
}

export function createSupabaseApi(): Api {
  const client = createClient(url ?? '', anonKey ?? '', {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  async function currentUserId(): Promise<string> {
    const { data } = await client.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new ApiError('Inicie sessão para continuar.');
    return id;
  }

  async function fetchOrder(orderId: string): Promise<Order | null> {
    const { data, error } = await client.from('orders').select(ORDER_SELECT).eq('id', orderId).maybeSingle();
    if (error) fail(error);
    return data ? toOrder(data as unknown as OrderRow) : null;
  }

  return {
    mode: 'supabase',

    // As políticas RLS já devolvem só livros publicados a visitantes; para
    // um admin autenticado filtramos aqui para a loja pública não mostrar rascunhos.
    async getCatalog() {
      const catalog = await loadCatalog(client);
      const books = catalog.books.filter((b) => b.published);
      const ids = new Set(books.map((b) => b.id));
      return { ...catalog, books, preorders: catalog.preorders.filter((p) => ids.has(p.bookId)) };
    },

    async subscribeNewsletter(email) {
      const { error } = await client.rpc('subscribe_newsletter', { p_email: email });
      if (error) fail(error, 'Não foi possível concluir a subscrição.');
    },

    async getCurrentProfile() {
      const { data: session } = await client.auth.getSession();
      const id = session.session?.user.id;
      if (!id) return null;
      const { data, error } = await client.from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) fail(error);
      return data ? toProfile(data as ProfileRow) : null;
    },

    onAuthChange(callback) {
      const { data } = client.auth.onAuthStateChange(() => callback());
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new ApiError(translateAuthError(error.message));
    },

    async signUp(email, password, fullName) {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/conta` },
      });
      if (error) throw new ApiError(translateAuthError(error.message));
      return { needsConfirmation: !data.session };
    },

    async signOut() {
      await client.auth.signOut();
    },

    async updateProfile({ fullName, phone }) {
      const id = await currentUserId();
      const { data, error } = await client.from('profiles').update({ full_name: fullName, phone }).eq('id', id).select('*').single();
      if (error) fail(error);
      return toProfile(data as ProfileRow);
    },

    async placeOrder(input) {
      const { data, error } = await client.rpc('place_order', {
        p_items: input.items.map((i) => ({ book_id: i.bookId, quantity: i.quantity })),
        p_customer: input.customer,
        p_address: input.address,
        p_delivery_method: input.deliveryMethod,
        p_payment_method: input.paymentMethod,
      });
      if (error) fail(error, 'Não foi possível criar a encomenda.');
      const order = await fetchOrder(data as string);
      if (!order) throw new ApiError('Encomenda criada, mas não foi possível carregá-la. Consulte a sua conta.');
      return order;
    },

    async startOnlinePayment(orderId) {
      const { data, error } = await client.functions.invoke('create-payment', { body: { orderId } });
      if (error || !data?.redirectUrl) {
        throw new ApiError('O pagamento online está temporariamente indisponível. Escolha outro método ou tente mais tarde.');
      }
      return { redirectUrl: String(data.redirectUrl) };
    },

    async cancelMyOrder(orderId) {
      const { error } = await client.rpc('cancel_my_order', { p_order_id: orderId });
      if (error) fail(error);
    },

    async listMyOrders() {
      const id = await currentUserId();
      const { data, error } = await client.from('orders').select(ORDER_SELECT).eq('user_id', id).order('created_at', { ascending: false });
      if (error) fail(error);
      return (data as unknown as OrderRow[]).map(toOrder);
    },

    async getMyOrder(orderId) {
      const id = await currentUserId();
      const order = await fetchOrder(orderId);
      // A RLS já o garante; esta verificação evita mostrar a um admin uma
      // encomenda alheia na área de cliente.
      return order && order.userId === id ? order : null;
    },

    admin: {
      getCatalog: () => loadCatalog(client),

      async saveBook(input) {
        const row = fromBook(input);
        const query = input.id
          ? client.from('books').update(row).eq('id', input.id).select('*').single()
          : client.from('books').insert(row).select('*').single();
        const { data, error } = await query;
        if (error) fail(error, 'Não foi possível guardar o livro.');
        return toBook(data as BookRow);
      },

      async deleteBook(id) {
        const { error } = await client.from('books').delete().eq('id', id);
        if (error?.code === '23503') throw new ApiError('Este livro tem encomendas associadas. Despublique-o em vez de o eliminar.');
        if (error) fail(error);
      },

      async saveAuthor(input: AuthorInput) {
        const row = { slug: input.slug, name: input.name, bio: input.bio, photo_url: input.photoUrl };
        const query = input.id
          ? client.from('authors').update(row).eq('id', input.id).select('*').single()
          : client.from('authors').insert(row).select('*').single();
        const { data, error } = await query;
        if (error) fail(error, 'Não foi possível guardar o autor.');
        return toAuthor(data as AuthorRow);
      },

      async deleteAuthor(id) {
        const { error } = await client.from('authors').delete().eq('id', id);
        if (error?.code === '23503') throw new ApiError('Este autor tem livros associados. Reatribua-os primeiro.');
        if (error) fail(error);
      },

      async savePreorder(input: PreorderInput) {
        const row = {
          enabled: input.enabled,
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          unit_limit: input.unitLimit,
          special_price: input.specialPrice,
          expected_ship_date: input.expectedShipDate,
          benefits: input.benefits,
        };
        const { error } = input.id
          ? await client.from('preorders').update(row).eq('id', input.id)
          : await client.from('preorders').insert({ ...row, book_id: input.bookId });
        if (error) fail(error, 'Não foi possível guardar a pré-venda.');
      },

      async deletePreorder(id) {
        const { data } = await client.from('preorders').select('reserved').eq('id', id).maybeSingle();
        if (data && (data as { reserved: number }).reserved > 0) {
          throw new ApiError('Esta pré-venda tem reservas. Feche-a em vez de a eliminar.');
        }
        const { error } = await client.from('preorders').delete().eq('id', id);
        if (error) fail(error);
      },

      async listOrders() {
        const { data, error } = await client.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(1000);
        if (error) fail(error);
        return (data as unknown as OrderRow[]).map(toOrder);
      },

      async updateOrderStatus(orderId, status) {
        const { error } = await client.rpc('admin_update_order_status', { p_order_id: orderId, p_status: status });
        if (error) fail(error);
      },

      async setPaymentStatus(orderId, status) {
        const { error } = await client.rpc('admin_set_payment_status', { p_order_id: orderId, p_status: status });
        if (error) fail(error);
      },

      async listCustomers() {
        const { data, error } = await client.rpc('admin_customers');
        if (error) fail(error);
        return (data as (ProfileRow & { orders: number; spent: number })[]).map(
          (r): CustomerSummary => ({ ...toProfile(r), orders: Number(r.orders), spent: Number(r.spent) }),
        );
      },

      async listSubscribers() {
        const { data, error } = await client.from('newsletter_subscribers').select('id, email, created_at').order('created_at', { ascending: false });
        if (error) fail(error);
        return (data as { id: string; email: string; created_at: string }[]).map(
          (r): NewsletterSubscriber => ({ id: r.id, email: r.email, createdAt: r.created_at }),
        );
      },

      async uploadImage(file, folder) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new ApiError('Use imagens JPG, PNG ou WebP.');
        if (file.size > 5 * 1024 * 1024) throw new ApiError('A imagem não pode ter mais de 5 MB.');
        const ext = file.type.split('/')[1];
        const path = `${folder}/${crypto.randomUUID()}.${ext}`;
        const { error } = await client.storage.from('media').upload(path, file, { cacheControl: '31536000', upsert: false });
        if (error) fail({ message: error.message }, 'Não foi possível carregar a imagem.');
        return client.storage.from('media').getPublicUrl(path).data.publicUrl;
      },
    },
  };
}
