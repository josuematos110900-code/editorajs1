import { Navigate, useSearchParams } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';
import { useSeo } from '../lib/seo';

/** Só aceita caminhos internos em ?voltar= (evita redirecionamentos abertos). */
function safeReturn(value: string | null, fallback: string) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

export default function SignIn({ mode = 'entrar' }: { mode?: 'entrar' | 'registar' }) {
  const { profile } = useAuth();
  const [params] = useSearchParams();
  useSeo({ title: mode === 'entrar' ? 'Entrar' : 'Criar conta', noindex: true });

  const target = (role: string | undefined) => safeReturn(params.get('voltar'), role === 'admin' ? '/admin' : '/conta');
  if (profile) return <Navigate to={target(profile.role)} replace />;

  return (
    <div className="container-page flex justify-center py-12 sm:py-20">
      <div className="w-full max-w-md">
        <h1 className="t-h1 text-center">{mode === 'entrar' ? 'Bem-vindo de volta' : 'Criar conta'}</h1>
        <p className="mt-3 text-center text-muted">Acompanhe encomendas e pré-vendas na sua conta.</p>
        <div className="mt-8 rounded-card border border-line bg-surface p-6 sm:p-8">
          {/* Ao entrar, o perfil muda e o <Navigate> acima redireciona. */}
          <AuthForm initialMode={mode} />
        </div>
      </div>
    </div>
  );
}
