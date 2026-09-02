import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/ui/Feedback';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError('Indica o teu nome.');
    if (!email.includes('@')) return setError('Indica um email válido.');
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (password !== confirmPassword) return setError('As senhas não coincidem.');

    setLoading(true);
    const { error } = await signUp(email, password, fullName.trim());
    setLoading(false);

    if (error) return setError(error);

    setSuccess(true);
    setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
  }

  if (success) {
    return (
      <AuthLayout title="Conta criada!" subtitle="A preparar o teu espaço financeiro…">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Se a confirmação de email estiver ativa no teu projeto Supabase, verifica a tua caixa de entrada antes de
          entrar.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Cria a tua conta" subtitle="Gratuito para começar a organizar as tuas finanças hoje.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <label className="label" htmlFor="fullName">Nome</label>
          <input id="fullName" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="O teu nome" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" type="password" autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">Confirmar senha</label>
          <input id="confirmPassword" type="password" autoComplete="new-password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repete a senha" />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'A criar conta…' : 'Criar conta'}
        </button>
      </form>
      <p className="text-sm text-ink-500 dark:text-ink-400 mt-6 text-center">
        Já tens conta?{' '}
        <Link to="/login" className="font-medium text-brand-600 dark:text-brand-400">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
