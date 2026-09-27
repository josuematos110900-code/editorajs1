import { NavLink } from 'react-router-dom';
import { BookOpen, CalendarClock, LayoutDashboard, Mail, Package, PenLine, Users } from 'lucide-react';
import { cn } from '../../lib/cn';

export const adminNav = [
  { to: '/admin', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/admin/encomendas', label: 'Encomendas', icon: Package },
  { to: '/admin/pre-vendas', label: 'Pré-vendas', icon: CalendarClock },
  { to: '/admin/livros', label: 'Livros', icon: BookOpen },
  { to: '/admin/autores', label: 'Autores', icon: PenLine },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/newsletter', label: 'Newsletter', icon: Mail },
];

export function AdminSidebar({ className }: { className?: string }) {
  return (
    <nav aria-label="Administração" className={className}>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {adminNav.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="shrink-0">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition',
                  isActive ? 'bg-secondary text-background' : 'text-fg/85 hover:bg-surface-alt hover:text-fg',
                )
              }
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
