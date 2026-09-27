import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { api, demoMode } from '../data';
import { DEMO_ACCOUNTS } from '../data/demoApi';
import { useAuth } from '../context/AuthContext';
import { fieldErrors } from '../lib/validation';
import { Button } from './ui/Button';
import { Notice } from './ui/Feedback';
import { TextField } from './ui/Form';

const signInSchema = z.object({
  email: z.string().trim().email('Indique um e-mail válido.'),
  password: z.string().min(1, 'Indique a palavra-passe.'),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(3, 'Indique o nome completo.'),
  email: z.string().trim().email('Indique um e-mail válido.'),
  password: z.string().min(8, 'Use pelo menos 8 caracteres.'),
});

/** Entrar / criar conta. Usado nas páginas de autenticação e dentro do checkout. */
export function AuthForm({ initialMode = 'entrar', onDone }: { initialMode?: 'entrar' | 'registar'; onDone?: () => void }) {
  const { refresh } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [values, setValues] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setInfo('');
    const parsed = (mode === 'entrar' ? signInSchema : signUpSchema).safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      if (mode === 'entrar') {
        await api.signIn(values.email, values.password);
      } else {
        const { needsConfirmation } = await api.signUp(values.email, values.password, values.fullName.trim());
        if (needsConfirmation) {
          setInfo('Conta criada! Confirme o seu e-mail através da ligação que enviámos e depois entre.');
          setMode('entrar');
          return;
        }
      }
      await refresh();
      onDone?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível concluir o pedido.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 rounded-md bg-paper-200 p-1" role="tablist" aria-label="Tipo de acesso">
        {(['entrar', 'registar'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setErrors({});
              setFormError('');
            }}
            className={`rounded px-3 py-2 text-sm font-medium transition ${mode === m ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-600 hover:text-ink-900'}`}
          >
            {m === 'entrar' ? 'Já tenho conta' : 'Criar conta'}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {mode === 'registar' && <TextField label="Nome completo" autoComplete="name" value={values.fullName} onChange={set('fullName')} error={errors.fullName} required />}
        <TextField label="E-mail" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} required />
        <TextField
          label="Palavra-passe"
          type="password"
          autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          hint={mode === 'registar' ? 'Pelo menos 8 caracteres.' : undefined}
          required
        />
        {formError && <Notice tone="error">{formError}</Notice>}
        {info && <Notice tone="success">{info}</Notice>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {mode === 'entrar' ? 'Entrar' : 'Criar conta'}
        </Button>
      </form>
      {demoMode && (
        <Notice className="mt-6" title="Contas de demonstração">
          Leitor: <code>{DEMO_ACCOUNTS.customer.email}</code> · Equipa: <code>{DEMO_ACCOUNTS.admin.email}</code> — palavra-passe <code>{DEMO_ACCOUNTS.admin.password}</code>
        </Notice>
      )}
    </div>
  );
}
