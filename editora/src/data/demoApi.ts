// Implementação de DEMONSTRAÇÃO da camada de dados: tudo vive no
// localStorage deste browser. Serve para ver e testar o site sem base de
// dados. Não tem segurança real (as "senhas" ficam no browser) — por isso
// só é ativada em desenvolvimento ou com VITE_DEMO_MODE=true.

import { canTransition, nextPaymentStatus, orderStatusAfterPayment } from '../lib/orderStatus';
import { OrderRejected, generateOrderNumber, priceOrder } from '../lib/orderEngine';
import type { Author, Book, NewsletterSubscriber, Order, OrderStatus, PaymentStatus, Preorder, Profile } from '../types';
import { ApiError, type Api, type Catalog, type CustomerSummary } from './api';
import { buildDemoCatalog } from './demoSeed';

const STORAGE_KEY = 'editora-demo-v1';

interface DemoUser extends Profile {
  password: string;
}

interface DemoState extends Catalog {
  users: DemoUser[];
  orders: Order[];
  subscribers: NewsletterSubscriber[];
  sessionUserId: string | null;
}

export const DEMO_ACCOUNTS = {
  admin: { email: 'admin@demo.local', password: 'demo1234' },
  customer: { email: 'leitor@demo.local', password: 'demo1234' },
};

function initialState(): DemoState {
  const created = new Date().toISOString();
  return {
    ...buildDemoCatalog(),
    users: [
      { id: 'usr-admin', email: DEMO_ACCOUNTS.admin.email, password: DEMO_ACCOUNTS.admin.password, fullName: 'Equipa Editorial (demo)', phone: '', role: 'admin', createdAt: created },
      { id: 'usr-leitor', email: DEMO_ACCOUNTS.customer.email, password: DEMO_ACCOUNTS.customer.password, fullName: 'Leitor de Demonstração', phone: '+244 900 000 001', role: 'customer', createdAt: created },
    ],
    orders: [],
    subscribers: [],
    sessionUserId: null,
  };
}

let memory: DemoState | null = null;

function load(): DemoState {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    memory = raw ? (JSON.parse(raw) as DemoState) : initialState();
  } catch {
    memory = initialState();
  }
  return memory;
}

function save(state: DemoState) {
  memory = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Sem armazenamento (modo privado): a demo continua a funcionar em memória.
  }
}

const listeners = new Set<() => void>();
function emitAuth() {
  listeners.forEach((l) => l());
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), 120));
}

function toProfile(user: DemoUser): Profile {
  const { password: _password, ...profile } = user;
  return profile;
}

function requireUser(state: DemoState): DemoUser {
  const user = state.users.find((u) => u.id === state.sessionUserId);
  if (!user) throw new ApiError('Inicie sessão para continuar.');
  return user;
}

function requireAdmin(state: DemoState): DemoUser {
  const user = requireUser(state);
  if (user.role !== 'admin') throw new ApiError('Sem permissão.');
  return user;
}

/** Devolve stock/reservas quando uma encomenda ativa é cancelada ou reembolsada. */
function releaseStock(state: DemoState, order: Order) {
  for (const item of order.items) {
    if (item.isPreorder) {
      const pre = state.preorders.find((p) => p.bookId === item.bookId);
      if (pre) pre.reserved = Math.max(0, pre.reserved - item.quantity);
    } else {
      const book = state.books.find((b) => b.id === item.bookId);
      if (book) book.stock += item.quantity;
    }
  }
}

function applyStatus(state: DemoState, order: Order, next: OrderStatus) {
  const wasActive = order.status !== 'cancelado' && order.status !== 'reembolsado';
  const nowInactive = next === 'cancelado' || next === 'reembolsado';
  if (wasActive && nowInactive) releaseStock(state, order);
  order.status = next;
}

function applyPayment(state: DemoState, order: Order, incoming: PaymentStatus) {
  const status = nextPaymentStatus(order.payment.status, incoming);
  if (status === order.payment.status) return;
  order.payment.status = status;
  order.payment.updatedAt = new Date().toISOString();
  applyStatus(state, order, orderStatusAfterPayment(order.status, status));
}

export function createDemoApi(): Api {
  return {
    mode: 'demo',

    async getCatalog() {
      const s = load();
      const books = s.books.filter((b) => b.published);
      const ids = new Set(books.map((b) => b.id));
      return delay({ books, authors: s.authors, categories: s.categories, preorders: s.preorders.filter((p) => ids.has(p.bookId)) });
    },

    async subscribeNewsletter(email) {
      const s = load();
      if (!s.subscribers.some((x) => x.email === email)) {
        s.subscribers.push({ id: uid('nl'), email, createdAt: new Date().toISOString() });
        save(s);
      }
      await delay(null);
    },

    async getCurrentProfile() {
      const s = load();
      const user = s.users.find((u) => u.id === s.sessionUserId);
      return user ? toProfile(user) : null;
    },

    onAuthChange(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },

    async signIn(email, password) {
      const s = load();
      const user = s.users.find((u) => u.email === email.trim().toLowerCase() && u.password === password);
      if (!user) throw new ApiError('E-mail ou palavra-passe incorretos.');
      s.sessionUserId = user.id;
      save(s);
      emitAuth();
    },

    async signUp(email, password, fullName) {
      const s = load();
      const normalized = email.trim().toLowerCase();
      if (s.users.some((u) => u.email === normalized)) throw new ApiError('Já existe uma conta com este e-mail.');
      const user: DemoUser = { id: uid('usr'), email: normalized, password, fullName, phone: '', role: 'customer', createdAt: new Date().toISOString() };
      s.users.push(user);
      s.sessionUserId = user.id;
      save(s);
      emitAuth();
      return { needsConfirmation: false };
    },

    async signOut() {
      const s = load();
      s.sessionUserId = null;
      save(s);
      emitAuth();
    },

    async updateProfile({ fullName, phone }) {
      const s = load();
      const user = requireUser(s);
      user.fullName = fullName;
      user.phone = phone;
      save(s);
      emitAuth();
      return delay(toProfile(user));
    },

    async placeOrder(input) {
      const s = load();
      const user = requireUser(s);
      let priced;
      try {
        priced = priceOrder(input.items, input.deliveryMethod, s.books, s.preorders);
      } catch (err) {
        if (err instanceof OrderRejected) throw new ApiError(err.message);
        throw err;
      }
      for (const item of priced.items) {
        if (item.isPreorder) s.preorders.find((p) => p.bookId === item.bookId)!.reserved += item.quantity;
        else s.books.find((b) => b.id === item.bookId)!.stock -= item.quantity;
      }
      const now = new Date().toISOString();
      const order: Order = {
        id: uid('ord'),
        number: generateOrderNumber(),
        userId: user.id,
        customerName: input.customer.fullName,
        customerEmail: input.customer.email,
        customerPhone: input.customer.phone,
        shippingAddress: {
          country: input.address.country ?? '',
          city: input.address.city ?? '',
          line1: input.address.line1 ?? '',
          line2: input.address.line2,
          postalCode: input.address.postalCode,
        },
        deliveryMethod: input.deliveryMethod,
        items: priced.items.map((item) => ({ ...item, id: uid('item') })),
        subtotal: priced.totals.subtotal,
        shippingCost: priced.totals.shipping,
        discount: priced.totals.discount,
        total: priced.totals.total,
        status: 'pendente',
        payment: { id: uid('pay'), method: input.paymentMethod, status: 'pendente', amount: priced.totals.total, providerReference: null, updatedAt: now },
        createdAt: now,
      };
      if (!user.phone) user.phone = input.customer.phone;
      s.orders.unshift(order);
      save(s);
      return delay(order);
    },

    async startOnlinePayment(orderId) {
      // Na demo não há provedor: simula o regresso do checkout com pagamento aprovado.
      const s = load();
      const user = requireUser(s);
      const order = s.orders.find((o) => o.id === orderId && o.userId === user.id);
      if (!order) throw new ApiError('Encomenda não encontrada.');
      applyPayment(s, order, 'aprovado');
      order.payment.providerReference = `DEMO-${order.number}`;
      save(s);
      return delay({ redirectUrl: `/encomenda/${order.id}?pagamento=sucesso` });
    },

    async cancelMyOrder(orderId) {
      const s = load();
      const user = requireUser(s);
      const order = s.orders.find((o) => o.id === orderId && o.userId === user.id);
      if (!order) throw new ApiError('Encomenda não encontrada.');
      if (order.status !== 'pendente') throw new ApiError('Só é possível cancelar encomendas ainda por pagar. Contacte-nos.');
      order.payment.status = 'cancelado';
      applyStatus(s, order, 'cancelado');
      save(s);
      await delay(null);
    },

    async listMyOrders() {
      const s = load();
      const user = requireUser(s);
      return delay(s.orders.filter((o) => o.userId === user.id));
    },

    async getMyOrder(orderId) {
      const s = load();
      const user = requireUser(s);
      return delay(s.orders.find((o) => o.id === orderId && o.userId === user.id) ?? null);
    },

    admin: {
      async getCatalog() {
        const s = load();
        requireAdmin(s);
        return delay({ books: s.books, authors: s.authors, categories: s.categories, preorders: s.preorders });
      },

      async saveBook(input) {
        const s = load();
        requireAdmin(s);
        if (s.books.some((b) => b.slug === input.slug && b.id !== input.id)) throw new ApiError('Já existe um livro com este URL (slug).');
        let book = s.books.find((b) => b.id === input.id);
        if (book) Object.assign(book, input);
        else {
          book = { ...input, id: uid('bk'), isDemo: false, createdAt: new Date().toISOString() } as Book;
          s.books.unshift(book);
        }
        save(s);
        return delay(book);
      },

      async deleteBook(id) {
        const s = load();
        requireAdmin(s);
        if (s.orders.some((o) => o.items.some((i) => i.bookId === id))) {
          throw new ApiError('Este livro tem encomendas associadas. Despublique-o em vez de o eliminar.');
        }
        s.books = s.books.filter((b) => b.id !== id);
        s.preorders = s.preorders.filter((p) => p.bookId !== id);
        save(s);
      },

      async saveAuthor(input) {
        const s = load();
        requireAdmin(s);
        if (s.authors.some((a) => a.slug === input.slug && a.id !== input.id)) throw new ApiError('Já existe um autor com este URL (slug).');
        let author = s.authors.find((a) => a.id === input.id);
        if (author) Object.assign(author, input);
        else {
          author = { ...input, id: uid('aut'), isDemo: false } as Author;
          s.authors.push(author);
        }
        save(s);
        return delay(author);
      },

      async deleteAuthor(id) {
        const s = load();
        requireAdmin(s);
        if (s.books.some((b) => b.authorId === id)) throw new ApiError('Este autor tem livros associados. Reatribua-os primeiro.');
        s.authors = s.authors.filter((a) => a.id !== id);
        save(s);
      },

      async savePreorder(input) {
        const s = load();
        requireAdmin(s);
        const existing = s.preorders.find((p) => p.id === input.id || p.bookId === input.bookId);
        if (existing) Object.assign(existing, input, { id: existing.id });
        else s.preorders.push({ ...input, id: uid('pre'), reserved: 0 } as Preorder);
        save(s);
      },

      async deletePreorder(id) {
        const s = load();
        requireAdmin(s);
        const pre = s.preorders.find((p) => p.id === id);
        if (pre && pre.reserved > 0) throw new ApiError('Esta pré-venda tem reservas. Feche-a em vez de a eliminar.');
        s.preorders = s.preorders.filter((p) => p.id !== id);
        save(s);
      },

      async listOrders() {
        const s = load();
        requireAdmin(s);
        return delay(s.orders);
      },

      async updateOrderStatus(orderId, status) {
        const s = load();
        requireAdmin(s);
        const order = s.orders.find((o) => o.id === orderId);
        if (!order) throw new ApiError('Encomenda não encontrada.');
        if (!canTransition(order.status, status)) throw new ApiError('Mudança de estado não permitida.');
        if (status === 'pagamento_confirmado') order.payment.status = 'aprovado';
        if (status === 'reembolsado') order.payment.status = 'reembolsado';
        if (status === 'cancelado' && order.payment.status === 'pendente') order.payment.status = 'cancelado';
        order.payment.updatedAt = new Date().toISOString();
        applyStatus(s, order, status);
        save(s);
      },

      async setPaymentStatus(orderId, status) {
        const s = load();
        requireAdmin(s);
        const order = s.orders.find((o) => o.id === orderId);
        if (!order) throw new ApiError('Encomenda não encontrada.');
        applyPayment(s, order, status);
        save(s);
      },

      async listCustomers() {
        const s = load();
        requireAdmin(s);
        const result: CustomerSummary[] = s.users.map((u) => {
          const orders = s.orders.filter((o) => o.userId === u.id);
          const spent = orders
            .filter((o) => o.payment.status === 'aprovado')
            .reduce((sum, o) => sum + o.total, 0);
          return { ...toProfile(u), orders: orders.length, spent };
        });
        return delay(result);
      },

      async listSubscribers() {
        const s = load();
        requireAdmin(s);
        return delay(s.subscribers);
      },

      async uploadImage(file) {
        requireAdmin(load());
        if (file.size > 1_500_000) throw new ApiError('Na demonstração, as imagens estão limitadas a 1,5 MB.');
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new ApiError('Não foi possível ler a imagem.'));
          reader.readAsDataURL(file);
        });
      },
    },
  };
}

/** Repõe os dados de demonstração (botão no painel). */
export function resetDemoData() {
  save(initialState());
  emitAuth();
}
