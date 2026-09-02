import { useState } from 'react';
import { Moon, Sun, Bell, LogOut, Wallet2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications, useNotificationMutations } from '../../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { data: notifications = [] } = useNotifications();
  const { markAsRead, markAllAsRead } = useNotificationMutations();
  const [openNotifications, setOpenNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-16 bg-ink-50/80 dark:bg-ink-950/80 backdrop-blur border-b border-ink-100 dark:border-ink-800">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
          <Wallet2 size={16} />
        </div>
        <span className="font-display font-bold text-ink-900 dark:text-white">FinançasPro</span>
      </div>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800 transition"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setOpenNotifications((v) => !v)}
            className="relative p-2.5 rounded-xl text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800 transition"
            aria-label="Notificações"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-coral-500" />
            )}
          </button>

          {openNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenNotifications(false)} />
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto card z-50 animate-scale-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-ink-800">
                  <p className="font-medium text-sm text-ink-900 dark:text-white">Notificações</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead.mutate()}
                      className="text-xs text-brand-600 dark:text-brand-400 font-medium"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-ink-400 text-center py-8">Sem notificações por agora.</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markAsRead.mutate(n.id)}
                      className={`w-full text-left px-4 py-3 border-b border-ink-50 dark:border-ink-800 last:border-0 hover:bg-ink-50 dark:hover:bg-ink-800/60 transition ${
                        !n.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-ink-900 dark:text-white">{n.title}</p>
                      <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{n.message}</p>
                      <p className="text-[11px] text-ink-400 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: pt })}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => signOut()}
          className="p-2.5 rounded-xl text-ink-500 hover:bg-coral-50 hover:text-coral-600 dark:text-ink-400 dark:hover:bg-coral-900/20 transition"
          aria-label="Terminar sessão"
          title="Terminar sessão"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
