import { Link, Outlet } from 'react-router-dom';
import { ExternalLink, LogOut, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { demoMode } from '../../data';
import { resetDemoData } from '../../data/demoApi';
import { useSeo } from '../../lib/seo';
import { AdminSidebar } from '../admin/AdminSidebar';
import { DemoBadge } from '../ui/Feedback';
import { Logo } from './Header';

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const { reload } = useCatalog();
  useSeo({ title: 'Administração', noindex: true });

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="border-b border-ink-100 bg-white">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden text-sm text-ink-400 sm:inline">/ Administração</span>
            {demoMode && <DemoBadge />}
          </div>
          <div className="flex items-center gap-1 text-sm">
            {demoMode && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Repor todos os dados de demonstração? Encomendas e alterações feitas serão perdidas.')) {
                    resetDemoData();
                    void reload();
                    location.reload();
                  }
                }}
                className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-ink-600 hover:bg-ink-100 sm:flex"
              >
                <RotateCcw size={15} aria-hidden="true" /> Repor demo
              </button>
            )}
            <Link to="/" className="flex items-center gap-1.5 rounded-md px-3 py-2 text-ink-600 hover:bg-ink-100">
              <ExternalLink size={15} aria-hidden="true" /> <span className="hidden sm:inline">Ver loja</span>
            </Link>
            <button type="button" onClick={() => void signOut()} className="flex items-center gap-1.5 rounded-md px-3 py-2 text-ink-600 hover:bg-ink-100" aria-label={`Sair (${profile?.email ?? ''})`}>
              <LogOut size={15} aria-hidden="true" /> <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>
      <div className="lg:grid lg:grid-cols-[15rem_1fr]">
        <aside className="border-b border-ink-100 bg-white px-3 py-3 lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r lg:py-6">
          <AdminSidebar />
        </aside>
        <main id="conteudo" className="min-w-0 px-4 py-8 sm:px-8" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-medium">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
