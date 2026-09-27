import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { site } from '../../config/site';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { cn } from '../../lib/cn';

const nav = [
  { to: '/pre-venda', label: 'Pré-venda' },
  { to: '/livros', label: 'Catálogo' },
  { to: '/autores', label: 'Autores' },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)} aria-label={`${site.name} — página inicial`}>
      <img src={site.logo} alt="" width={32} height={32} className="h-8 w-8" />
      <span className="font-display text-lg font-semibold leading-none tracking-tight text-ink-950">{site.shortName}</span>
    </Link>
  );
}

export function Header() {
  const { count } = useCart();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn('text-[15px] transition hover:text-seal-700', isActive ? 'text-ink-950 font-semibold' : 'text-ink-700');

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-ink-950 focus:px-3 focus:py-2 focus:text-paper-50">
        Saltar para o conteúdo
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={linkClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1">
          <Link to="/livros?focus=pesquisa" className="rounded-md p-2.5 text-ink-700 hover:bg-ink-100 hover:text-ink-950" aria-label="Pesquisar livros">
            <Search size={20} />
          </Link>
          <Link
            to={profile ? (profile.role === 'admin' ? '/admin' : '/conta') : '/entrar'}
            className="rounded-md p-2.5 text-ink-700 hover:bg-ink-100 hover:text-ink-950"
            aria-label={profile ? 'A minha conta' : 'Entrar'}
          >
            <User size={20} />
          </Link>
          <Link to="/carrinho" className="relative rounded-md p-2.5 text-ink-700 hover:bg-ink-100 hover:text-ink-950" aria-label={`Carrinho, ${count} ${count === 1 ? 'artigo' : 'artigos'}`}>
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-seal-700 px-1 text-[10px] font-semibold text-white" aria-hidden="true">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="rounded-md p-2.5 text-ink-700 hover:bg-ink-100 md:hidden"
            aria-expanded={open}
            aria-controls="menu-movel"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="menu-movel" aria-label="Principal (móvel)" className="border-t border-ink-100 bg-paper md:hidden">
          <ul className="container-page flex flex-col py-2">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => cn('block py-3 font-display text-xl', isActive ? 'text-seal-700' : 'text-ink-900')}>
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to={profile ? '/conta' : '/entrar'} className="block py-3 font-display text-xl text-ink-900">
                {profile ? 'A minha conta' : 'Entrar'}
              </NavLink>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
