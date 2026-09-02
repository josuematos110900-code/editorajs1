import type { Transaction, Budget, Goal, Profile, RecurringPayment } from '../types/database';
import { differenceInCalendarDays, endOfMonth, startOfMonth, isWithinInterval, parseISO } from 'date-fns';

/**
 * Módulo central de cálculos financeiros do FinançasPro.
 * Todas as funções aqui são puras (sem I/O), o que as torna fáceis de testar
 * isoladamente e garante que Dashboard, Contas, Orçamento e Relatórios
 * usam exatamente a mesma lógica — sem inconsistências entre ecrãs.
 */

export function sumByType(transactions: Transaction[], type: Transaction['type']): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((acc, t) => acc + Number(t.amount), 0);
}

/** Saldo = receitas − despesas (transferências não alteram o saldo total, só o saldo por conta) */
export function calculateBalance(transactions: Transaction[]): number {
  const receitas = sumByType(transactions, 'receita');
  const despesas = sumByType(transactions, 'despesa');
  return receitas - despesas;
}

export function filterByMonth(transactions: Transaction[], year: number, month: number): Transaction[] {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(new Date(year, month - 1, 1));
  return transactions.filter((t) => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start, end });
  });
}

export interface MonthSummary {
  receitas: number;
  despesas: number;
  saldo: number;
  poupanca: number;
}

/**
 * Resumo do mês. `poupanca` soma tudo o que foi lançado na(s) categoria(s)
 * de poupança/investimento (por convenção, despesas cuja categoria tem
 * nome "Poupança" ou "Investimentos") + contribuições diretas para metas,
 * que devem ser somadas fora desta função pelo chamador quando disponíveis.
 */
export function getMonthSummary(transactions: Transaction[], year: number, month: number): MonthSummary {
  const monthTx = filterByMonth(transactions, year, month);
  const receitas = sumByType(monthTx, 'receita');
  const despesas = sumByType(monthTx, 'despesa');
  return {
    receitas,
    despesas,
    saldo: receitas - despesas,
    poupanca: 0,
  };
}

/** Distribuição automática do rendimento com base nas percentagens definidas pelo utilizador. */
export interface AllocationInput {
  needs: number;
  savings: number;
  investments: number;
  leisure: number;
  goals: number;
}

export interface AllocationResult {
  needs: number;
  savings: number;
  investments: number;
  leisure: number;
  goals: number;
  totalPercent: number;
  isValid: boolean;
}

export function calculateAllocation(income: number, percentages: AllocationInput): AllocationResult {
  const totalPercent =
    percentages.needs + percentages.savings + percentages.investments + percentages.leisure + percentages.goals;

  return {
    needs: round2((income * percentages.needs) / 100),
    savings: round2((income * percentages.savings) / 100),
    investments: round2((income * percentages.investments) / 100),
    leisure: round2((income * percentages.leisure) / 100),
    goals: round2((income * percentages.goals) / 100),
    totalPercent: round2(totalPercent),
    isValid: Math.abs(totalPercent - 100) < 0.01,
  };
}

/**
 * "Quanto posso gastar hoje?"
 * = (saldo disponível − reservas de orçamento futuras já comprometidas) ÷ dias restantes do mês
 *
 * Onde saldo disponível = receitas do mês − despesas já realizadas − pagamentos
 * recorrentes ainda por vencer este mês − contribuições feitas para metas este mês.
 */
export interface DailySpendInput {
  monthlyIncome: number;
  expensesSoFar: number;
  upcomingRecurringThisMonth: number;
  goalContributionsThisMonth: number;
  today?: Date;
  referenceMonth?: Date; // mês a considerar (default: hoje)
}

export interface DailySpendResult {
  availableToSpend: number;
  daysRemaining: number;
  dailyBudget: number;
}

export function calculateDailyBudget(input: DailySpendInput): DailySpendResult {
  const today = input.today ?? new Date();
  const refMonth = input.referenceMonth ?? today;
  const monthEnd = endOfMonth(refMonth);

  const daysRemaining = Math.max(1, differenceInCalendarDays(monthEnd, today) + 1);

  const available =
    input.monthlyIncome -
    input.expensesSoFar -
    input.upcomingRecurringThisMonth -
    input.goalContributionsThisMonth;

  const dailyBudget = available > 0 ? available / daysRemaining : 0;

  return {
    availableToSpend: round2(available),
    daysRemaining,
    dailyBudget: round2(dailyBudget),
  };
}

/** Progresso do orçamento de uma categoria */
export interface BudgetProgress {
  budgetId: string;
  categoryId: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  alertLevel: 'ok' | 'atencao' | 'critico' | 'ultrapassado';
}

export function calculateBudgetProgress(
  budget: Budget,
  transactions: Transaction[]
): BudgetProgress {
  const spent = transactions
    .filter((t) => t.type === 'despesa' && t.category_id === budget.category_id)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const remaining = budget.amount - spent;
  const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

  let alertLevel: BudgetProgress['alertLevel'] = 'ok';
  if (percentUsed >= 100) alertLevel = 'ultrapassado';
  else if (percentUsed >= 90) alertLevel = 'critico';
  else if (percentUsed >= 70) alertLevel = 'atencao';

  return {
    budgetId: budget.id,
    categoryId: budget.category_id,
    budgeted: budget.amount,
    spent: round2(spent),
    remaining: round2(remaining),
    percentUsed: round2(percentUsed),
    alertLevel,
  };
}

/** Progresso de uma meta financeira */
export interface GoalProgress {
  goalId: string;
  percentComplete: number;
  remainingAmount: number;
  monthsRemaining: number | null;
  suggestedMonthlySaving: number | null;
  suggestedWeeklySaving: number | null;
  estimatedCompletionDate: Date | null;
  onTrack: boolean | null;
}

export function calculateGoalProgress(goal: Goal, today: Date = new Date()): GoalProgress {
  const remainingAmount = Math.max(0, goal.target_amount - goal.current_amount);
  const percentComplete =
    goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;

  let monthsRemaining: number | null = null;
  let suggestedMonthlySaving: number | null = null;
  let suggestedWeeklySaving: number | null = null;
  let onTrack: boolean | null = null;

  if (goal.deadline) {
    const deadline = parseISO(goal.deadline);
    const daysLeft = Math.max(0, differenceInCalendarDays(deadline, today));
    monthsRemaining = Math.max(1, Math.ceil(daysLeft / 30));
    suggestedMonthlySaving = round2(remainingAmount / monthsRemaining);
    suggestedWeeklySaving = round2(remainingAmount / Math.max(1, Math.ceil(daysLeft / 7)));
    onTrack = remainingAmount <= 0 ? true : suggestedMonthlySaving <= goal.target_amount; // heurística simples
  }

  return {
    goalId: goal.id,
    percentComplete: round2(percentComplete),
    remainingAmount: round2(remainingAmount),
    monthsRemaining,
    suggestedMonthlySaving,
    suggestedWeeklySaving,
    estimatedCompletionDate: goal.deadline ? parseISO(goal.deadline) : null,
    onTrack,
  };
}

/** Progresso do pagamento de uma dívida */
export function calculateDebtProgress(totalAmount: number, paidAmount: number) {
  const remaining = Math.max(0, totalAmount - paidAmount);
  const percentPaid = totalAmount > 0 ? Math.min(100, (paidAmount / totalAmount) * 100) : 0;
  return {
    remaining: round2(remaining),
    percentPaid: round2(percentPaid),
  };
}

/** Próximos vencimentos (pagamentos recorrentes ordenados por data) */
export function getUpcomingRecurring(payments: RecurringPayment[], withinDays = 14, today = new Date()) {
  return payments
    .filter((p) => p.active)
    .map((p) => ({
      payment: p,
      daysUntilDue: differenceInCalendarDays(parseISO(p.next_due_date), today),
    }))
    .filter((p) => p.daysUntilDue >= 0 && p.daysUntilDue <= withinDays)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/** Total ainda a pagar em recorrentes dentro do mês corrente (para o cálculo de "quanto posso gastar hoje") */
export function sumRecurringDueThisMonth(payments: RecurringPayment[], today = new Date()) {
  const monthEnd = endOfMonth(today);
  return payments
    .filter((p) => p.active)
    .filter((p) => {
      const due = parseISO(p.next_due_date);
      return due >= today && due <= monthEnd;
    })
    .reduce((acc, p) => acc + Number(p.amount), 0);
}

/** Agrupa despesas por categoria (para gráficos de pizza/barras) */
export function groupExpensesByCategory(
  transactions: Transaction[],
  categoryNameById: Record<string, string>
) {
  const map = new Map<string, number>();
  transactions
    .filter((t) => t.type === 'despesa')
    .forEach((t) => {
      const name = t.category_id ? categoryNameById[t.category_id] ?? 'Outros' : 'Outros';
      map.set(name, (map.get(name) ?? 0) + Number(t.amount));
    });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: round2(value) }))
    .sort((a, b) => b.value - a.value);
}

/** Compara dois meses (para relatórios: "Agosto vs Julho") */
export function comparePeriods(current: MonthSummary, previous: MonthSummary) {
  const pctChange = (curr: number, prev: number) => (prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100);
  return {
    receitasChangePercent: round2(pctChange(current.receitas, previous.receitas)),
    despesasChangePercent: round2(pctChange(current.despesas, previous.despesas)),
    saldoChangePercent: round2(pctChange(current.saldo, previous.saldo)),
  };
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getSalaryDistributionDefaults(profile: Pick<Profile,
  'allocation_needs' | 'allocation_savings' | 'allocation_investments' | 'allocation_leisure' | 'allocation_goals'>
): AllocationInput {
  return {
    needs: profile.allocation_needs,
    savings: profile.allocation_savings,
    investments: profile.allocation_investments,
    leisure: profile.allocation_leisure,
    goals: profile.allocation_goals,
  };
}
