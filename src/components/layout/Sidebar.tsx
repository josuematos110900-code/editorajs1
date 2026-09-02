import { NavLink } from 'react-router-dom';
import { Wallet2, ShieldCheck } from 'lucide-react';
import { NAV_ITEMS } from './nav-items';
import { useProfile } from '../../context/ProfileContext';

export function Sidebar() {
  const { profile } = useProfile();
  const firstName = profile?.full_name?.split(' ')[0] || 'Utilizador';
  const isAdmin = profile?.role === 'admin';

  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 px-4 py-6">
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shrink-0">
          <Wallet2 size={18} />
        </div>
        <div>
          <p className="font-display font-bold text-ink-900 dark:text-white leading-tight">FinançasPro</p>
          <p className="text-xs text-ink-400">Olá, {firstName}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100'
              }`
            }
          >
            <ShieldCheck size={18} />
            Admin
          </NavLink>
        )}
      </nav>

      <div className="mt-4 px-3 py-3 rounded-xl bg-ink-50 dark:bg-ink-800/60 text-xs text-ink-500 dark:text-ink-400">
        FinançasPro v1.0 — Angola &amp; Brasil
      </div>
    </aside>
  );
}
