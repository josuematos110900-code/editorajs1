import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { RecurringPayment } from '../types/database';
import { translateRpcError } from '../lib/rpcErrors';

export function useRecurringPayments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['recurring', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_payments')
        .select('*')
        .order('next_due_date', { ascending: true });
      if (error) throw error;
      return data as RecurringPayment[];
    },
    enabled: !!user,
  });
}

type NewRecurring = Pick<
  RecurringPayment,
  'name' | 'amount' | 'type' | 'frequency' | 'next_due_date' | 'category_id' | 'account_id'
>;

export function useRecurringMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['recurring', user?.id] });

  const create = useMutation({
    mutationFn: async (input: NewRecurring) => {
      if (!user) throw new Error('Não autenticado');
      // RPC em vez de insert direto: valida o valor e o limite do plano
      // Free (3 pagamentos recorrentes) no servidor.
      const { error } = await supabase.rpc('create_recurring_payment', {
        p_name: input.name,
        p_amount: input.amount,
        p_type: input.type,
        p_frequency: input.frequency,
        p_next_due_date: input.next_due_date,
        p_category_id: input.category_id,
        p_account_id: input.account_id,
      });
      if (error) throw new Error(translateRpcError(error, 'recurring'));
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RecurringPayment> }) => {
      const { error } = await supabase.from('recurring_payments').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /**
   * Regista o pagamento: cria a transação correspondente e avança
   * next_due_date, tudo numa RPC atómica com bloqueio de linha (FOR UPDATE)
   * e um índice único (recurring_payment_id, date) que impede duplo-clique
   * de criar duas transações para o mesmo vencimento.
   */
  const markAsPaid = useMutation({
    mutationFn: async (payment: RecurringPayment) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.rpc('mark_recurring_payment_paid', {
        p_recurring_id: payment.id,
      });
      if (error) throw new Error(translateRpcError(error));
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['transactions', user?.id] });
      qc.invalidateQueries({ queryKey: ['account_balances', user?.id] });
    },
  });

  return { create, update, remove, markAsPaid };
}
