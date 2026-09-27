import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { RequireAdmin, RequireAuth } from './components/layout/Guards';
import { PublicLayout } from './components/layout/PublicLayout';
import { Spinner } from './components/ui/Feedback';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CatalogProvider } from './context/CatalogContext';
import { configurationMissing } from './data';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

// Páginas públicas secundárias e todo o painel em chunks separados:
// quem só visita a loja não descarrega o código de administração.
const Catalog = lazy(() => import('./pages/Catalog'));
const BookPage = lazy(() => import('./pages/BookPage'));
const Preorders = lazy(() => import('./pages/Preorders'));
const PreorderPage = lazy(() => import('./pages/PreorderPage'));
const Authors = lazy(() => import('./pages/Authors'));
const AuthorPage = lazy(() => import('./pages/AuthorPage'));
const Policy = lazy(() => import('./pages/Policy'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const SignIn = lazy(() => import('./pages/SignIn'));
const Account = lazy(() => import('./pages/account/Account'));
const OrderPage = lazy(() => import('./pages/account/OrderPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminPreorders = lazy(() => import('./pages/admin/AdminPreorders'));
const AdminBooks = lazy(() => import('./pages/admin/AdminBooks'));
const AdminBookForm = lazy(() => import('./pages/admin/AdminBookForm'));
const AdminAuthors = lazy(() => import('./pages/admin/AdminAuthors'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminNewsletter = lazy(() => import('./pages/admin/AdminNewsletter'));

export default function App() {
  if (configurationMissing) return <ConfigurationMissing />;

  return (
    <BrowserRouter>
      <AuthProvider>
        <CatalogProvider>
          <CartProvider>
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route index element={<Home />} />
                  <Route path="livros" element={<Catalog />} />
                  <Route path="livros/:slug" element={<BookPage />} />
                  <Route path="pre-venda" element={<Preorders />} />
                  <Route path="pre-venda/:slug" element={<PreorderPage />} />
                  <Route path="autores" element={<Authors />} />
                  <Route path="autores/:slug" element={<AuthorPage />} />
                  <Route path="informacoes/:slug" element={<Policy />} />
                  <Route path="carrinho" element={<Cart />} />
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="entrar" element={<SignIn mode="entrar" />} />
                  <Route path="registar" element={<SignIn mode="registar" />} />
                  <Route element={<RequireAuth />}>
                    <Route path="conta" element={<Account />} />
                    <Route path="encomenda/:id" element={<OrderPage />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Route>

                <Route path="admin" element={<RequireAdmin />}>
                  <Route element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="encomendas" element={<AdminOrders />} />
                    <Route path="pre-vendas" element={<AdminPreorders />} />
                    <Route path="livros" element={<AdminBooks />} />
                    <Route path="livros/novo" element={<AdminBookForm />} />
                    <Route path="livros/:id" element={<AdminBookForm />} />
                    <Route path="autores" element={<AdminAuthors />} />
                    <Route path="clientes" element={<AdminCustomers />} />
                    <Route path="newsletter" element={<AdminNewsletter />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </CartProvider>
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function ConfigurationMissing() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-medium">Configuração em falta</h1>
        <p className="mt-3 text-ink-600">
          Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no ambiente de build (ver <code>editora/README.md</code>).
        </p>
      </div>
    </div>
  );
}
