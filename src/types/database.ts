// Tipos que espelham o schema do Supabase (supabase/schema.sql)

export type CurrencyCode = 'AOA' | 'BRL';
export type TransactionType = 'receita' | 'despesa' | 'transferencia';
export type RecurrenceFrequency = 'nenhuma' | 'semanal' | 'quinzenal' | 'mensal' | 'anual';
export type GoalStatus = 'em_progresso' | 'concluida' | 'pausada';
export type DebtStatus = 'ativa' | 'quitada';
export type AccountType = 'dinheiro' | 'banco' | 'conta_salario' | 'poupanca' | 'carteira_digital' | 'outra';
export type NotificationType = 'orcamento' | 'meta' | 'recorrente' | 'divida' | 'sistema';
export type PlanType = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired';
export type UserRole = 'user' | 'admin';
export type BillingProvider = 'cakto' | 'okanda';

export interface Profile {
  id: string;
  full_name: string;
  country: string;
  currency: CurrencyCode;
  monthly_income: number;
  income_day: number;
  main_goal: string;
  savings_target_percent: number;
  allocation_needs: number;
  allocation_savings: number;
  allocation_investments: number;
  allocation_leisure: number;
  allocation_goals: number;
  theme: 'light' | 'dark' | 'system';
  role: UserRole;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  color: string;
  icon: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountBalance {
  account_id: string;
  user_id: string;
  name: string;
  initial_balance: number;
  balance: number;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  is_default: boolean;
  parent_id: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category_id: string | null;
  account_id: string;
  transfer_to_account_id: string | null;
  date: string;
  notes: string;
  is_recurring: boolean;
  recurring_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  status: GoalStatus;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface GoalContribution {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  date: string;
  notes: string;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  creditor: string;
  total_amount: number;
  paid_amount: number;
  installment_amount: number;
  due_date: string | null;
  interest_rate: number;
  status: DebtStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: string;
  user_id: string;
  debt_id: string;
  amount: number;
  date: string;
  created_at: string;
}

export interface RecurringPayment {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  next_due_date: string;
  category_id: string | null;
  account_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  country: string | null;
  currency: CurrencyCode | null;
  billing_provider: BillingProvider | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  provider_product_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  auto_renew: boolean;
  canceled_at: string | null;
  trial_reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}
