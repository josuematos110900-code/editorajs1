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
            'h-12 w-full min-w-0 rounded-md border px-3 text-[15px] focus:outline-none focus:ring-2 sm:h-11 sm:flex-1',
            dark ? 'border-ink-700 bg-secondary text-background placeholder:text-ink-300 focus:ring-paper-50/30' : 'border-line bg-surface focus:ring-primary/20',
          )}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className={cn('h-12 shrink-0 rounded-md px-5 sm:h-11 text-[15px] font-medium transition disabled:opacity-60', dark ? 'bg-background text-fg hover:bg-surface-alt' : 'bg-secondary text-background hover:bg-primary')}
        >
          {state === 'loading' ? 'A enviar…' : 'Subscrever'}
        </button>
      </div>
      {message && (
        <p id={`newsletter-${tone}-msg`} role={state === 'error' ? 'alert' : 'status'} className={cn('mt-2 text-sm', state === 'error' ? (dark ? 'text-seal-100' : 'text-primary') : dark ? 'text-success-soft' : 'text-success')}>
          {message}
        </p>
      )}
    </form>
  );
}
