import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Debt } from '../types/database';
import { translateRpcError } from '../lib/rpcErrors';

export function useDebts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['debts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('debts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Debt[];
    },
    enabled: !!user,
  });
}

export function useDebtMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['debts', user?.id] });

  const create = useMutation({
    mutationFn: async (
      input: Pick<Debt, 'name' | 'creditor' | 'total_amount' | 'installment_amount' | 'due_date' | 'interest_rate' | 'notes'>
    ) => {
      if (!user) throw new Error('Não autenticado');
      // RPC em vez de insert direto: valida o valor e o limite do plano
      // Free (2 dívidas) no servidor.
      const { error } = await supabase.rpc('create_debt', {
        p_name: input.name,
        p_creditor: input.creditor,
        p_total_amount: input.total_amount,
        p_installment_amount: input.installment_amount,
        p_due_date: input.due_date,
        p_interest_rate: input.interest_rate,
        p_notes: input.notes,
      });
      if (error) throw new Error(translateRpcError(error, 'debts'));
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Debt> }) => {
      const { error } = await supabase.from('debts').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('debts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const registerPayment = useMutation({
    mutationFn: async (input: { debt_id: string; amount: number; date: string }) => {
      if (!user) throw new Error('Não autenticado');
      // RPC atómica: bloqueia a linha da dívida (FOR UPDATE) enquanto cria
      // o pagamento e atualiza o valor pago, na mesma transação.
      const { error } = await supabase.rpc('register_debt_payment', {
        p_debt_id: input.debt_id,
        p_amount: input.amount,
        p_date: input.date,
      });
      if (error) throw new Error(translateRpcError(error));
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, registerPayment };
}
