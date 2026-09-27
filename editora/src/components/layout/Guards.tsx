import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/Feedback';

/** Rotas de cliente: exige sessão. */
export function RequireAuth() {
  const { profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!profile) return <Navigate to={`/entrar?voltar=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <Outlet />;
}

/**
 * Rotas de administração: exige papel "admin". Isto só controla a
 * interface — a proteção real está nas políticas RLS e nas funções SQL,
 * que recusam qualquer escrita de quem não é admin.
 */
export function RequireAdmin() {
  const { profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!profile) return <Navigate to={`/entrar?voltar=${encodeURIComponent(location.pathname)}`} replace />;
  if (profile.role !== 'admin') return <Navigate to="/conta" replace />;
  return <Outlet />;
}
