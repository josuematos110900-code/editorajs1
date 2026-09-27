import { useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { site } from '../../config/site';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { cn } from '../../lib/cn';

const mainNav = [
  { to: '/pre-venda', label: 'Pré-vendas' },
  { to: '/livros', label: 'Catálogo' },
  { to: '/autores', label: 'Autores' },
  { to: '/sobre', label: 'Sobre nós' },
  { to: '/contacto', label: 'Contacto' },
];

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link to="/" className={cn('flex min-h-11 items-center gap-2.5', className)} aria-label={`${site.name} — página inicial`}>
      <img src={site.logo} alt="" width={32} height={32} className={cn('h-8 w-8', inverted && 'rounded-md ring-1 ring-paper-50/25')} />
      <span className={cn('font-display text-lg font-semibold leading-none tracking-tight', inverted ? 'text-paper-50' : 'text-fg')}>{site.shortName}</span>
    </Link>
  );
}

const iconButton = 'flex h-11 w-11 items-center justify-center rounded-md text-fg/85 transition-colors hover:bg-surface-alt hover:text-fg';

export function Header() {
  const { count } = useCart();
  const { profile } = useAuth();
  const location = useLocation();
  // O menu guarda a página onde foi aberto: ao navegar, fecha sozinho.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === location.pathname;
  const setOpen = (value: boolean) => setOpenAt(value ? location.pathname : null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function onSearch(e: FormEvent) {
    e.preventDefault();
    navigate(`/livros${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '?focus=pesquisa'}`);
    setOpen(false);
  }

  const accountHref = profile ? (profile.role === 'admin' ? '/admin' : '/conta') : '/entrar';

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-secondary focus:px-3 focus:py-2 focus:text-background">
        Saltar para o conteúdo
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {mainNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'relative py-2 text-[15px] transition-colors hover:text-primary',
                      isActive ? 'font-medium text-fg after:absolute after:inset-x-0 after:-bottom-[1px] after:h-px after:bg-primary' : 'text-fg/80',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="-mr-2 flex items-center">
          <Link to="/livros?focus=pesquisa" className={iconButton} aria-label="Pesquisar livros">
            <Search size={20} />
          </Link>
          <Link to={accountHref} className={cn(iconButton, 'hidden sm:flex')} aria-label={profile ? 'A minha conta' : 'Entrar'}>
            <User size={20} />
          </Link>
          <Link to="/carrinho" className={cn(iconButton, 'relative')} aria-label={`Carrinho, ${count} ${count === 1 ? 'artigo' : 'artigos'}`}>
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white" aria-hidden="true">
                {count}
              </span>
            )}
          </Link>
          <button type="button" className={cn(iconButton, 'lg:hidden')} aria-expanded={open} aria-controls="menu-movel" aria-label={open ? 'Fechar menu' : 'Abrir menu'} onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="menu-movel" className="animate-slide-in border-t border-line bg-background lg:hidden">
          <div className="container-page pb-6 pt-4">
            <form role="search" onSubmit={onSearch}>
              <label htmlFor="pesquisa-menu" className="sr-only">Pesquisar livros</label>
              <div className="relative">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input id="pesquisa-menu" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Título, autor ou ISBN" className="input pl-10" />
              </div>
            </form>
            <nav aria-label="Principal (móvel)" className="mt-4">
              <ul className="divide-y divide-line">
                {[...mainNav, { to: accountHref, label: profile ? 'A minha conta' : 'Entrar' }].map((item) => (
                  <li key={item.to + item.label}>
                    <NavLink to={item.to} className={({ isActive }) => cn('block py-3.5 font-display text-xl', isActive ? 'text-primary' : 'text-fg')}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
