import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/ui/Feedback';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes('@')) return setError('Indica um email válido.');
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) return setError(error);
    setSent(true);
  }

  return (
    <AuthLayout title="Recuperar senha" subtitle="Enviamos-te um link para redefinires a tua senha.">
      {sent ? (
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Se existir uma conta com o email <strong>{email}</strong>, vais receber um link de recuperação em breve.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'A enviar…' : 'Enviar link de recuperação'}
          </button>
        </form>
      )}
      <p className="text-sm text-ink-500 dark:text-ink-400 mt-6 text-center">
        <Link to="/login" className="font-medium text-brand-600 dark:text-brand-400">
          Voltar ao login
        </Link>
      </p>
    </AuthLayout>
  );
}
