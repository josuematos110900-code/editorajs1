import type { Budget, Category, Goal, RecurringPayment, Transaction } from '../types/database';
import { calculateBudgetProgress, calculateGoalProgress } from './finance';
import { formatCurrency } from './currency';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export interface LiveAlert {
  id: string;
  level: 'info' | 'atencao' | 'critico';
  title: string;
  message: string;
}

interface AlertsInput {
  transactions: Transaction[];
  previousMonthTransactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  goals: Goal[];
  recurringPayments: RecurringPayment[];
  currency: import('../types/database').CurrencyCode;
  today?: Date;
}

/**
 * Gera alertas 100% a partir dos dados reais do utilizador — sem valores inventados.
 * Usado no Dashboard e na área de Assistente Financeiro.
 */
export function generateLiveAlerts(input: AlertsInput): LiveAlert[] {
  const today = input.today ?? new Date();
  const alerts: LiveAlert[] = [];
  const categoryName = (id: string | null) => input.categories.find((c) => c.id === id)?.name ?? 'categoria';

  // 1. Orçamentos por categoria
  input.budgets.forEach((budget) => {
    const progress = calculateBudgetProgress(budget, input.transactions);
    const name = categoryName(budget.category_id);
    if (progress.alertLevel === 'ultrapassado') {
      alerts.push({
        id: `budget-${budget.id}`,
        level: 'critico',
        title: `Orçamento de ${name} ultrapassado`,
        message: `Já gastaste ${formatCurrency(progress.spent, input.currency)} de um orçamento de ${formatCurrency(
          progress.budgeted,
          input.currency
        )} (${progress.percentUsed}%).`,
      });
    } else if (progress.alertLevel === 'critico') {
      alerts.push({
        id: `budget-${budget.id}`,
        level: 'critico',
        title: `Quase no limite: ${name}`,
        message: `Já utilizaste ${progress.percentUsed}% do orçamento de ${name}.`,
      });
    } else if (progress.alertLevel === 'atencao') {
      alerts.push({
        id: `budget-${budget.id}`,
        level: 'atencao',
        title: `Atenção ao orçamento de ${name}`,
        message: `Já utilizaste ${progress.percentUsed}% do orçamento de ${name} este mês.`,
      });
    }
  });

  // 2. Comparação de gastos por categoria vs mês anterior (aumento >= 20%)
  const spentByCategory = (txs: Transaction[]) => {
    const map = new Map<string, number>();
    txs
      .filter((t) => t.type === 'despesa')
      .forEach((t) => {
        const key = t.category_id ?? 'sem-categoria';
        map.set(key, (map.get(key) ?? 0) + Number(t.amount));
      });
    return map;
  };
  const currentSpent = spentByCategory(input.transactions);
  const previousSpent = spentByCategory(input.previousMonthTransactions);
  currentSpent.forEach((value, categoryId) => {
    const prevValue = previousSpent.get(categoryId) ?? 0;
    if (prevValue > 0) {
      const change = ((value - prevValue) / prevValue) * 100;
      if (change >= 20) {
        alerts.push({
          id: `trend-${categoryId}`,
          level: 'atencao',
          title: `Aumento em ${categoryName(categoryId)}`,
          message: `A tua despesa com ${categoryName(categoryId)} aumentou ${Math.round(change)}% em relação ao mês passado.`,
        });
      }
    }
  });

  // 3. Pagamentos recorrentes a vencer em breve
  input.recurringPayments
    .filter((p) => p.active)
    .forEach((p) => {
      const daysUntil = differenceInCalendarDays(parseISO(p.next_due_date), today);
      if (daysUntil >= 0 && daysUntil <= 3) {
        alerts.push({
          id: `recurring-${p.id}`,
          level: daysUntil === 0 ? 'critico' : 'atencao',
          title: `${p.name} vence ${daysUntil === 0 ? 'hoje' : `em ${daysUntil} dia${daysUntil > 1 ? 's' : ''}`}`,
          message: `Valor: ${formatCurrency(p.amount, input.currency)}.`,
        });
      }
    });

  // 4. Metas: perto de concluir ou fora do prazo
  input.goals
    .filter((g) => g.status === 'em_progresso')
    .forEach((g) => {
      const progress = calculateGoalProgress(g, today);
      if (progress.percentComplete >= 90) {
        alerts.push({
          id: `goal-${g.id}`,
          level: 'info',
          title: `Estás quase lá: ${g.name}`,
          message: `Já concluíste ${progress.percentComplete}% da tua meta.`,
        });
      } else if (progress.suggestedMonthlySaving && progress.monthsRemaining && progress.monthsRemaining <= 2) {
        alerts.push({
          id: `goal-deadline-${g.id}`,
          level: 'atencao',
          title: `Prazo a aproximar-se: ${g.name}`,
          message: `Para atingires esta meta no prazo, precisas de poupar cerca de ${formatCurrency(
            progress.suggestedMonthlySaving,
            input.currency
          )} por mês.`,
        });
      }
    });

  return alerts;
}
