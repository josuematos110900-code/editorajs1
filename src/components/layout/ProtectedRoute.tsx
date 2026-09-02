import { Navigate, Outlet, useLocation } from 'react-router-dom';
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
  const { profile, isLoading } = useProfile();
  const location = useLocation();

  if (isLoading || !profile) return <FullPageSpinner />;

  if (!profile.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  if (profile.onboarding_completed && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { profile, isLoading } = useProfile();

  if (isLoading || !profile) return <FullPageSpinner />;
  if (profile.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
