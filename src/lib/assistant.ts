import type { Budget, Category, Goal, RecurringPayment, Transaction, CurrencyCode } from '../types/database';
import { calculateDailyBudget, calculateGoalProgress, filterByMonth, sumByType, sumRecurringDueThisMonth } from './finance';
import { formatCurrency } from './currency';

/**
 * Assistente financeiro simples baseado em regras e nos dados reais do utilizador.
 * Não usa nenhuma API externa de IA nesta versão — a arquitetura (uma função pura
 * que recebe uma pergunta + contexto de dados e devolve uma resposta) permite
 * substituir facilmente esta implementação por uma chamada a um modelo de
 * linguagem no futuro, mantendo o mesmo contrato de entrada/saída.
 */

export interface AssistantContext {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  categories: Category[];
  recurringPayments: RecurringPayment[];
  monthlyIncome: number;
  currency: CurrencyCode;
  today?: Date;
}

export interface AssistantAnswer {
  question: string;
  answer: string;
}

const MONEY_REGEX = /(\d+(?:[.,]\d+)?)(?:\s*(mil|k))?/i;

function parseAmount(text: string): number | null {
  const match = text.match(MONEY_REGEX);
  if (!match) return null;
  let value = parseFloat(match[1].replace(',', '.'));
  if (match[2]) value *= 1000;
  return value;
}

export function answerQuestion(question: string, ctx: AssistantContext): AssistantAnswer {
  const q = question.toLowerCase().trim();
  const today = ctx.today ?? new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const monthTx = filterByMonth(ctx.transactions, year, month);

  // "Quanto posso gastar hoje?"
  if (q.includes('gastar hoje') || (q.includes('posso gastar') && !MONEY_REGEX.test(q))) {
    const expensesSoFar = sumByType(monthTx, 'despesa');
    const recurringDue = sumRecurringDueThisMonth(ctx.recurringPayments, today);
    const goalContribThisMonth = 0;
    const result = calculateDailyBudget({
      monthlyIncome: ctx.monthlyIncome,
      expensesSoFar,
      upcomingRecurringThisMonth: recurringDue,
      goalContributionsThisMonth: goalContribThisMonth,
      today,
    });
    return {
      question,
      answer:
        result.dailyBudget > 0
          ? `Podes gastar aproximadamente ${formatCurrency(result.dailyBudget, ctx.currency)} por dia nos próximos ${result.daysRemaining} dias sem ultrapassar o teu rendimento mensal.`
          : `O teu orçamento para este mês já foi ultrapassado. Considera rever as tuas despesas antes de novos gastos.`,
    };
  }

  // "Posso gastar X este fim de semana / hoje / em Y?"
  if (q.includes('posso gastar')) {
    const amount = parseAmount(q);
    if (amount) {
      const expensesSoFar = sumByType(monthTx, 'despesa');
      const recurringDue = sumRecurringDueThisMonth(ctx.recurringPayments, today);
      const available = ctx.monthlyIncome - expensesSoFar - recurringDue;
      const canAfford = amount <= available;
      return {
        question,
        answer: canAfford
          ? `Sim — atualmente tens ${formatCurrency(available, ctx.currency)} disponíveis este mês, por isso ${formatCurrency(amount, ctx.currency)} cabe no teu orçamento.`
          : `Convém teres cuidado: só tens ${formatCurrency(Math.max(0, available), ctx.currency)} disponíveis este mês, e esse valor é superior ao que resta.`,
      };
    }
  }

  // "Quanto preciso poupar por mês?"
  if (q.includes('preciso poupar') || q.includes('quanto poupar')) {
    const activeGoals = ctx.goals.filter((g) => g.status === 'em_progresso' && g.deadline);
    if (activeGoals.length === 0) {
      return { question, answer: 'Ainda não tens metas com prazo definido. Cria uma meta em "Metas" para eu poder calcular quanto precisas poupar por mês.' };
    }
    const lines = activeGoals.map((g) => {
      const progress = calculateGoalProgress(g, today);
      return `• ${g.name}: ${formatCurrency(progress.suggestedMonthlySaving ?? 0, ctx.currency)}/mês`;
    });
    return { question, answer: `Para cumprires as tuas metas no prazo:\n${lines.join('\n')}` };
  }

  // "Quanto gastei em X?"
  if (q.includes('quanto gastei')) {
    const category = ctx.categories.find((c) => q.includes(c.name.toLowerCase()));
    if (category) {
      const total = monthTx
        .filter((t) => t.type === 'despesa' && t.category_id === category.id)
        .reduce((acc, t) => acc + Number(t.amount), 0);
      return { question, answer: `Gastaste ${formatCurrency(total, ctx.currency)} em ${category.name} este mês.` };
    }
    const total = sumByType(monthTx, 'despesa');
    return { question, answer: `Gastaste um total de ${formatCurrency(total, ctx.currency)} este mês.` };
  }

  // "Quanto falta para a minha meta X?"
  if (q.includes('falta') && q.includes('meta')) {
    const goal = ctx.goals.find((g) => q.includes(g.name.toLowerCase())) ?? ctx.goals[0];
    if (!goal) return { question, answer: 'Ainda não criaste nenhuma meta financeira.' };
    const progress = calculateGoalProgress(goal, today);
    return {
      question,
      answer: `Faltam ${formatCurrency(progress.remainingAmount, ctx.currency)} para atingires a meta "${goal.name}" (${progress.percentComplete}% concluída).`,
    };
  }

  return {
    question,
    answer:
      'Podes perguntar-me coisas como: "Quanto posso gastar hoje?", "Quanto gastei em alimentação?", "Quanto falta para a minha meta?" ou "Quanto preciso poupar por mês?".',
  };
}
