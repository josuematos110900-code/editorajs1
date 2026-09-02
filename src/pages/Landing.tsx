import { Link } from 'react-router-dom';
import {
  Wallet2,
  TrendingUp,
  PiggyBank,
  Target,
  ShieldCheck,
  CreditCard,
  BarChart3,
  Check,
  Moon,
} from 'lucide-react';
import { PLAN_CONFIG, TRIAL_DAYS } from '../lib/plans';

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Sabe sempre quanto podes gastar',
    description: 'O Dashboard calcula automaticamente quanto tens disponível por dia, com base no que já gastaste e no que ainda vem por aí.',
  },
  {
    icon: PiggyBank,
    title: 'Distribuição automática do salário',
    description: 'Define percentagens para Necessidades, Poupança, Investimentos, Lazer e Metas — o cálculo faz-se sozinho.',
  },
  {
    icon: Target,
    title: 'Metas com prazo e progresso',
    description: 'Cria objetivos financeiros e vê exatamente quanto precisas poupar por mês para os cumprires a tempo.',
  },
  {
    icon: CreditCard,
    title: 'Dívidas e pagamentos recorrentes',
    description: 'Acompanha o progresso de pagamento de dívidas e recebe avisos antes de contas fixas vencerem.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios e comparação de meses',
    description: 'Compara Agosto com Julho, vê onde gastaste mais, e acompanha a evolução do teu saldo ao longo do tempo.',
  },
  {
    icon: ShieldCheck,
    title: 'Os teus dados só são vistos por ti',
    description: 'Cada conta tem os seus próprios dados isolados e protegidos — ninguém mais consegue aceder-lhes.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: 'Grátis',
    period: '',
    description: 'Para começares a organizar as tuas finanças sem custos.',
    features: [
      '2 contas/carteiras',
      '2 metas ativas',
      '2 dívidas',
      '5 orçamentos por categoria',
      '3 pagamentos recorrentes',
      'Receitas e despesas ilimitadas',
    ],
    cta: 'Criar conta grátis',
    highlighted: false,
  },
  {
    name: 'Premium',
    price: `${TRIAL_DAYS} dias grátis`,
    period: `depois ${PLAN_CONFIG.BR.priceLabel} ou ${PLAN_CONFIG.AO.priceLabel}`,
    description: 'Sem limites, para quem gere as finanças a sério.',
    features: [
      'Contas, metas e dívidas ilimitadas',
      'Orçamento sem limite de categorias',
      'Pagamentos recorrentes ilimitados',
      'Tudo o que está no Free',
      'Cancela quando quiseres',
    ],
    cta: 'Começar o trial grátis',
    highlighted: true,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-ink-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-ink-950/90 backdrop-blur border-b border-ink-100 dark:border-ink-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
              <Wallet2 size={16} />
            </div>
            <span className="font-display font-bold text-ink-900 dark:text-white">FinançasPro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white">
              Entrar
            </Link>
            <Link to="/registar" className="btn-primary text-sm py-2 px-4">
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 mx-auto mb-6">
          Angola 🇦🇴 &amp; Brasil 🇧🇷
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink-900 dark:text-white leading-tight">
          Controla o teu dinheiro com clareza,<br className="hidden sm:block" /> sem planilhas complicadas.
        </h1>
        <p className="text-ink-500 dark:text-ink-400 mt-5 max-w-xl mx-auto">
          Salário, orçamento, poupança, metas e dívidas — tudo num só lugar. Sabe exatamente
          quanto podes gastar hoje, sem adivinhar.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link to="/registar" className="btn-primary px-6 py-3 text-base w-full sm:w-auto">
            Começar grátis — sem cartão
          </Link>
          <Link to="/login" className="btn-secondary px-6 py-3 text-base w-full sm:w-auto">
            Já tenho conta
          </Link>
        </div>
        <p className="text-xs text-ink-400 mt-4">14 dias de Premium grátis em qualquer plano novo. Cancela quando quiseres.</p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="card p-6">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                <feature.icon size={20} />
              </div>
              <h3 className="font-display font-semibold text-ink-900 dark:text-white mb-1.5">{feature.title}</h3>
              <p className="text-sm text-ink-500 dark:text-ink-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-bold text-ink-900 dark:text-white">Preços simples, sem letras miúdas</h2>
          <p className="text-ink-500 dark:text-ink-400 mt-2">Começa grátis. Faz upgrade só quando precisares.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`card p-6 sm:p-8 relative ${plan.highlighted ? 'border-2 border-brand-500 dark:border-brand-500' : ''}`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-brand-600 text-white">
                  Recomendado
                </span>
              )}
              <h3 className="font-display font-bold text-lg text-ink-900 dark:text-white">{plan.name}</h3>
              <p className="text-2xl font-bold text-ink-900 dark:text-white mt-2">{plan.price}</p>
              {plan.period && <p className="text-xs text-ink-400 mt-0.5">{plan.period}</p>}
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-3">{plan.description}</p>
              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300">
                    <Check size={16} className="text-brand-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/registar"
                className={`w-full mt-6 text-center block ${plan.highlighted ? 'btn-primary' : 'btn-secondary'}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Dark mode mention */}
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="card p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-ink-100 dark:bg-ink-800 flex items-center justify-center shrink-0">
            <Moon size={18} className="text-ink-500 dark:text-ink-300" />
          </div>
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Modo claro e escuro, funciona bem no telemóvel e no computador, e pode ser instalado como app.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-100 dark:border-ink-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-400">
          <span>© {new Date().getFullYear()} FinançasPro</span>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-ink-600 dark:hover:text-ink-200">Entrar</Link>
            <Link to="/registar" className="hover:text-ink-600 dark:hover:text-ink-200">Criar conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
