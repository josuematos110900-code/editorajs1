import { useState, type FormEvent } from 'react';
import { api } from '../data';
import { cn } from '../lib/cn';
import { emailSchema } from '../lib/validation';

/** Subscrição da newsletter — nunca revela se o e-mail já estava registado. */
export function NewsletterForm({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setState('error');
      setMessage(parsed.error.issues[0].message);
      return;
    }
    setState('loading');
    try {
      await api.subscribeNewsletter(parsed.data);
      setState('done');
      setMessage('Obrigado! Vai receber a nossa próxima carta.');
      setEmail('');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Não foi possível subscrever.');
    }
  }

  const dark = tone === 'dark';
  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`newsletter-${tone}`} className="sr-only">
          O seu e-mail
        </label>
        <input
          id={`newsletter-${tone}`}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="o.seu@email.com"
          aria-invalid={state === 'error' || undefined}
          aria-describedby={message ? `newsletter-${tone}-msg` : undefined}
          className={cn(
            'h-11 flex-1 rounded-md border px-3 text-[15px] focus:outline-none focus:ring-2',
            dark ? 'border-ink-700 bg-ink-900 text-paper-50 placeholder:text-ink-400 focus:ring-paper-50/30' : 'border-ink-200 bg-white focus:ring-seal-600/20',
          )}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className={cn('h-11 rounded-md px-5 text-[15px] font-medium transition disabled:opacity-60', dark ? 'bg-paper-50 text-ink-950 hover:bg-paper-200' : 'bg-ink-950 text-paper-50 hover:bg-seal-700')}
        >
          {state === 'loading' ? 'A enviar…' : 'Subscrever'}
        </button>
      </div>
      {message && (
        <p id={`newsletter-${tone}-msg`} role={state === 'error' ? 'alert' : 'status'} className={cn('mt-2 text-sm', state === 'error' ? (dark ? 'text-seal-100' : 'text-seal-700') : dark ? 'text-leaf-100' : 'text-leaf-700')}>
          {message}
        </p>
      )}
    </form>
  );
}
