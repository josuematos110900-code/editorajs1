import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ErrorBanner } from '../components/ui/Feedback';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  // Enquanto o Supabase não processa o token que vem no link do email (na
  // hash da URL, ex: #access_token=...&type=recovery), ainda não há sessão
  // válida para trocar a senha. Esperamos por isso antes de mostrar o form.
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkValid, setLinkValid] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Se o Supabase já processou o link e criou uma sessão de recuperação,
    // getSession() devolve-a. Também ouvimos o evento PASSWORD_RECOVERY,
    // que o supabase-js dispara assim que interpreta o token da URL.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setLinkValid(true);
      }
      setCheckingLink(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setLinkValid(true);
        setCheckingLink(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (password !== confirmPassword) return setError('As senhas não coincidem.');

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) return setError(error);

    setSuccess(true);
    setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
  }

  if (checkingLink) {
    return (
      <AuthLayout title="A verificar o link…" subtitle="Um momento, por favor.">
        <div />
      </AuthLayout>
    );
  }

  if (!linkValid) {
    return (
      <AuthLayout title="Link inválido ou expirado" subtitle="Este link de recuperação já não é válido.">
        <ErrorBanner message="Pede um novo link de recuperação de senha — os links expiram passado algum tempo ou só podem ser usados uma vez." />
        <button className="btn-primary w-full mt-4" onClick={() => navigate('/recuperar-senha')}>
          Pedir novo link
        </button>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title="Senha alterada!" subtitle="Vais ser redirecionado para a app…">
        <div />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Define a tua nova senha" subtitle="Escolhe uma senha nova para a tua conta.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <label className="label" htmlFor="password">Nova senha</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="input pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">Confirmar nova senha</label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repete a senha"
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'A guardar…' : 'Guardar nova senha'}
        </button>
      </form>
    </AuthLayout>
  );
}
