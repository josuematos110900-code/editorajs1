import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from './Footer';
import { Header } from './Header';

export function PublicLayout() {
  const { pathname } = useLocation();
  // No checkout o rodapé sai: menos distrações no momento da compra.
  const focused = pathname === '/checkout';
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="conteudo" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      {focused ? (
        <p className="border-t border-line py-6 text-center t-small text-muted">Pagamento seguro · Nunca guardamos dados de cartão bancário</p>
      ) : (
        <Footer showNewsletter={pathname !== '/'} />
      )}
    </div>
  );
}
