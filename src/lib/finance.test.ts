import { describe, it, expect } from 'vitest';
import {
  calculateBalance,
  calculateAllocation,
  calculateDailyBudget,
  calculateBudgetProgress,
  calculateGoalProgress,
  calculateDebtProgress,
  groupExpensesByCategory,
  sumByType,
} from './finance';
import type { Transaction, Budget, Goal } from '../types/database';

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    user_id: 'u1',
    type: 'despesa',
    description: 'x',
    amount: 0,
    category_id: null,
    account_id: 'a1',
    transfer_to_account_id: null,
    date: '2026-08-10',
    notes: '',
    is_recurring: false,
    recurring_payment_id: null,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

describe('cálculos financeiros — caso da secção 29 do requisito', () => {
  it('Receita 300.000, Despesas 100.000, Poupança 50.000 => saldo 150.000', () => {
    const transactions: Transaction[] = [
      tx({ type: 'receita', amount: 300000 }),
      tx({ type: 'despesa', amount: 100000 }),
      // poupança lançada como despesa da categoria "Poupança" — reduz o saldo de caixa disponível,
      // mas o valor acumulado de poupança é acompanhado à parte (goal_contributions / metas)
      tx({ type: 'despesa', amount: 50000 }),
    ];
    const saldo = calculateBalance(transactions);
    expect(saldo).toBe(150000);
  });

  it('soma receitas e despesas corretamente e de forma consistente', () => {
    const transactions: Transaction[] = [
      tx({ type: 'receita', amount: 300000 }),
      tx({ type: 'despesa', amount: 100000 }),
    ];
    expect(sumByType(transactions, 'receita')).toBe(300000);
    expect(sumByType(transactions, 'despesa')).toBe(100000);
  });
});

describe('distribuição automática do salário', () => {
  it('300.000 Kz distribuídos em 50/20/10/10/10', () => {
    const result = calculateAllocation(300000, {
      needs: 50,
      savings: 20,
      investments: 10,
      leisure: 10,
      goals: 10,
    });
    expect(result.needs).toBe(150000);
    expect(result.savings).toBe(60000);
    expect(result.investments).toBe(30000);
    expect(result.leisure).toBe(30000);
    expect(result.goals).toBe(30000);
    expect(result.totalPercent).toBe(100);
    expect(result.isValid).toBe(true);
  });

  it('rejeita percentagens que não somam 100%', () => {
    const result = calculateAllocation(100000, {
      needs: 50,
      savings: 20,
      investments: 10,
      leisure: 10,
      goals: 5,
    });
    expect(result.isValid).toBe(false);
    expect(result.totalPercent).toBe(95);
  });
});

describe('"quanto posso gastar hoje"', () => {
  it('calcula corretamente o orçamento diário disponível', () => {
    // 10 Agosto 2026, mês termina 31 Agosto => faltam 22 dias (inclusive)
    const today = new Date(2026, 7, 10);
    const result = calculateDailyBudget({
      monthlyIncome: 300000,
      expensesSoFar: 100000,
      upcomingRecurringThisMonth: 20000,
      goalContributionsThisMonth: 10000,
      today,
    });
    // disponível = 300000 - 100000 - 20000 - 10000 = 170000
    expect(result.availableToSpend).toBe(170000);
    expect(result.daysRemaining).toBe(22);
    expect(result.dailyBudget).toBeCloseTo(170000 / 22, 2);
  });

  it('nunca devolve orçamento diário negativo', () => {
    const result = calculateDailyBudget({
      monthlyIncome: 50000,
      expensesSoFar: 80000,
      upcomingRecurringThisMonth: 0,
      goalContributionsThisMonth: 0,
      today: new Date(2026, 7, 15),
    });
    expect(result.dailyBudget).toBe(0);
  });
});

describe('orçamento por categoria', () => {
  const budget: Budget = {
    id: 'b1',
    user_id: 'u1',
    category_id: 'cat-alimentacao',
    amount: 60000,
    month: 8,
    year: 2026,
    created_at: '',
    updated_at: '',
  };

  it('marca "atencao" a partir de 70% de utilização', () => {
    const transactions = [tx({ category_id: 'cat-alimentacao', amount: 42000 })]; // 70%
    const progress = calculateBudgetProgress(budget, transactions);
    expect(progress.percentUsed).toBe(70);
    expect(progress.alertLevel).toBe('atencao');
  });

  it('marca "ultrapassado" acima de 100%', () => {
    const transactions = [tx({ category_id: 'cat-alimentacao', amount: 65000 })];
    const progress = calculateBudgetProgress(budget, transactions);
    expect(progress.alertLevel).toBe('ultrapassado');
    expect(progress.remaining).toBe(-5000);
  });
});

describe('metas financeiras', () => {
  it('calcula progresso, valor mensal sugerido e data de conclusão', () => {
    const goal: Goal = {
      id: 'g1',
      user_id: 'u1',
      name: 'Computador',
      target_amount: 800000,
      current_amount: 200000,
      deadline: '2027-06-10',
      status: 'em_progresso',
      color: '#000',
      icon: 'target',
      created_at: '',
      updated_at: '',
    };
    const today = new Date(2026, 7, 10); // 10 Ago 2026 -> ~10 meses até 10 Jun 2027
    const progress = calculateGoalProgress(goal, today);
    expect(progress.percentComplete).toBe(25);
    expect(progress.remainingAmount).toBe(600000);
    expect(progress.monthsRemaining).toBeGreaterThanOrEqual(9);
    expect(progress.suggestedMonthlySaving).toBeGreaterThan(0);
  });
});

describe('dívidas', () => {
  it('calcula percentagem paga e valor restante', () => {
    const result = calculateDebtProgress(500000, 125000);
    expect(result.percentPaid).toBe(25);
    expect(result.remaining).toBe(375000);
  });
});

describe('agrupamento de despesas por categoria', () => {
  it('agrupa e ordena por valor decrescente', () => {
    const transactions = [
      tx({ category_id: 'c1', amount: 10000 }),
      tx({ category_id: 'c2', amount: 50000 }),
      tx({ category_id: 'c1', amount: 5000 }),
    ];
    const grouped = groupExpensesByCategory(transactions, { c1: 'Alimentação', c2: 'Transporte' });
    expect(grouped[0]).toEqual({ name: 'Transporte', value: 50000 });
    expect(grouped[1]).toEqual({ name: 'Alimentação', value: 15000 });
  });
});
