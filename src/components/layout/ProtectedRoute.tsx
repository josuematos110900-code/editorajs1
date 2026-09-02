import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { FullPageSpinner } from '../ui/Feedback';

export function ProtectedRoute() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  return <ProfileGate />;
}

function ProfileGate() {
  const { profile, isLoading, profileMissing } = useProfile();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;
  if (profileMissing) return <ProfileMissingScreen />;
  if (!profile) return <FullPageSpinner />;

  if (!profile.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  if (profile.onboarding_completed && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/**
 * Mostrado quando o utilizador está autenticado mas não tem nenhuma
 * linha em "profiles" — nunca deveria bloquear a pessoa num ecrã em
 * branco ou num spinner infinito (Fase 12: nunca "erro desconhecido").
 * O caso mais comum é uma conta criada no Supabase Auth antes da base
 * de dados ter o schema aplicado, ou diretamente pelo painel do
 * Supabase sem passar pelo registo da app.
 */
function ProfileMissingScreen() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950 px-6">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-coral-500/10 text-coral-600 dark:text-coral-400 flex items-center justify-center">
          <AlertTriangle size={26} />
        </div>
        <h1 className="font-display text-lg font-semibold text-ink-900 dark:text-white">
          Não encontrámos a tua conta
        </h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">
          A tua sessão está válida, mas não existe nenhum perfil associado a ela. Isto pode acontecer se a conta foi
          criada antes da base de dados estar totalmente configurada. Sai e regista-te novamente — os teus dados
          anteriores (se existirem) não são apagados por isto.
        </p>
        <button type="button" onClick={() => signOut()} className="btn-primary w-full">
          Sair e voltar ao registo
        </button>
      </div>
    </div>
  );
}

export function AdminRoute() {
  const { profile, isLoading, profileMissing } = useProfile();

  if (isLoading) return <FullPageSpinner />;
  if (profileMissing) return <ProfileMissingScreen />;
  if (!profile) return <FullPageSpinner />;
  if (profile.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
