import { type ReactNode } from 'react';
import { Wallet2, ShieldCheck, TrendingUp, PiggyBank } from 'lucide-react';

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink-50 dark:bg-ink-950">
      <div className="flex flex-col justify-center px-6 sm:px-10 py-12">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
              <Wallet2 size={20} />
            </div>
            <span className="font-display font-bold text-lg text-ink-900 dark:text-white">FinançasPro</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">{title}</h1>
          <p className="text-ink-500 dark:text-ink-400 text-sm mt-1.5 mb-8">{subtitle}</p>
          {children}
        </div>
      </div>

      <div className="hidden lg:flex flex-col justify-center relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 px-14 text-white">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="relative">
          <p className="font-display text-3xl font-bold leading-tight max-w-md">
            Controla o teu dinheiro com clareza, em Angola e no Brasil.
          </p>
          <p className="text-brand-100/80 mt-4 max-w-sm text-sm">
            Salário, orçamento, poupança, metas e dívidas — tudo num só lugar, com os teus dados sempre seguros.
          </p>

          <div className="mt-10 space-y-4">
            <Feature icon={TrendingUp} text="Saiba sempre quanto pode gastar hoje" />
            <Feature icon={PiggyBank} text="Distribua o salário automaticamente" />
            <Feature icon={ShieldCheck} text="Os teus dados só são vistos por ti" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof TrendingUp; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <p className="text-sm text-brand-50">{text}</p>
    </div>
  );
}
