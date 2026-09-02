import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Budget } from '../types/database';
import { translateRpcError } from '../lib/rpcErrors';

export function useBudgets(year: number, month: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['budgets', user?.id, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('year', year)
        .eq('month', month);
      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!user,
  });
}

export function useBudgetMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['budgets', user?.id] });

  const upsert = useMutation({
    mutationFn: async (input: Pick<Budget, 'category_id' | 'amount' | 'month' | 'year'>) => {
      if (!user) throw new Error('Não autenticado');
      // RPC em vez de upsert direto: replica no servidor a mesma regra que
      // já existia aqui (só conta para o limite de 5/mês se for categoria
      // nova nesse mês — editar um orçamento já existente nunca bloqueia).
      const { error } = await supabase.rpc('upsert_budget', {
        p_category_id: input.category_id,
        p_amount: input.amount,
        p_month: input.month,
        p_year: input.year,
      });
      if (error) throw new Error(translateRpcError(error));
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { upsert, remove };
}
