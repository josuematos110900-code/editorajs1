import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, AdminRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { FullPageSpinner } from './components/ui/Feedback';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Receitas from './pages/Receitas';
import Despesas from './pages/Despesas';
import Orcamento from './pages/Orcamento';
import Metas from './pages/Metas';
import Poupanca from './pages/Poupanca';
import Dividas from './pages/Dividas';
import Contas from './pages/Contas';
import Recorrentes from './pages/Recorrentes';
import Relatorios from './pages/Relatorios';
import Assistente from './pages/Assistente';
import Configuracoes from './pages/Configuracoes';
import Admin from './pages/Admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
                <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                <Route path="/registar" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
                <Route path="/recuperar-senha" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
                {/* Sem PublicOnlyRoute nem ProtectedRoute de propósito: o Supabase
                    cria uma sessão temporária de recuperação ao processar o link do
                    email, o que faria o PublicOnlyRoute redirecionar logo para o
                    Dashboard antes da pessoa conseguir definir a nova senha. */}
                <Route path="/redefinir-senha" element={<ResetPassword />} />

                <Route element={<ProtectedRouteWithProfile />}>
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/receitas" element={<Receitas />} />
                    <Route path="/despesas" element={<Despesas />} />
                    <Route path="/orcamento" element={<Orcamento />} />
                    <Route path="/metas" element={<Metas />} />
                    <Route path="/poupanca" element={<Poupanca />} />
                    <Route path="/dividas" element={<Dividas />} />
                    <Route path="/contas" element={<Contas />} />
                    <Route path="/recorrentes" element={<Recorrentes />} />
                    <Route path="/relatorios" element={<Relatorios />} />
                    <Route path="/assistente" element={<Assistente />} />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<Admin />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function ProtectedRouteWithProfile() {
  return (
    <ProfileProvider>
      <ProtectedRoute />
    </ProfileProvider>
  );
}
