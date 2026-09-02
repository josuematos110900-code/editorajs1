import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  Target,
  Coins,
  CreditCard,
  Wallet,
  Repeat,
  BarChart3,
  Settings,
  MessageCircleQuestion,
} from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/receitas', label: 'Receitas', icon: ArrowUpCircle },
  { to: '/despesas', label: 'Despesas', icon: ArrowDownCircle },
  { to: '/orcamento', label: 'Orçamento', icon: PiggyBank },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/poupanca', label: 'Poupança', icon: Coins },
  { to: '/dividas', label: 'Dívidas', icon: CreditCard },
  { to: '/contas', label: 'Contas', icon: Wallet },
  { to: '/recorrentes', label: 'Recorrentes', icon: Repeat },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/assistente', label: 'Assistente', icon: MessageCircleQuestion },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
] as const;

// Itens principais mostrados na barra inferior do telemóvel (máx. 5)
export const MOBILE_NAV_ITEMS = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/despesas', label: 'Despesas', icon: ArrowDownCircle },
  { to: '/orcamento', label: 'Orçamento', icon: PiggyBank },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/configuracoes', label: 'Mais', icon: Settings },
] as const;
