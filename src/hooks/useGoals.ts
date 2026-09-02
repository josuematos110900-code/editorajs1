import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Goal, GoalContribution } from '../types/database';
import { translateRpcError } from '../lib/rpcErrors';

export function useGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!user,
  });
}

export function useGoalContributions(goalId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['goal_contributions', user?.id, goalId],
    queryFn: async () => {
      let query = supabase.from('goal_contributions').select('*').order('date', { ascending: false });
      if (goalId) query = query.eq('goal_id', goalId);
      const { data, error } = await query;
      if (error) throw error;
      return data as GoalContribution[];
    },
    enabled: !!user,
  });
}

export function useGoalMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['goals', user?.id] });
    qc.invalidateQueries({ queryKey: ['goal_contributions', user?.id] });
  };

  const create = useMutation({
    mutationFn: async (input: Pick<Goal, 'name' | 'target_amount' | 'deadline' | 'color' | 'icon'>) => {
      if (!user) throw new Error('Não autenticado');
      // RPC em vez de insert direto: valida o valor e o limite do plano
      // Free (2 metas ativas) no servidor.
      const { error } = await supabase.rpc('create_goal', {
        p_name: input.name,
        p_target_amount: input.target_amount,
        p_deadline: input.deadline,
        p_color: input.color,
        p_icon: input.icon,
      });
      if (error) throw new Error(translateRpcError(error, 'goals'));
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Goal> }) => {
      const { error } = await supabase.from('goals').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addContribution = useMutation({
    mutationFn: async (input: { goal_id: string; amount: number; date: string; notes?: string }) => {
      if (!user) throw new Error('Não autenticado');
      // RPC atómica: bloqueia a linha da meta (FOR UPDATE) enquanto cria a
      // contribuição e atualiza o valor acumulado, na mesma transação —
      // evita perder valor se duas contribuições chegarem ao mesmo tempo.
      const { error } = await supabase.rpc('add_goal_contribution', {
        p_goal_id: input.goal_id,
        p_amount: input.amount,
        p_date: input.date,
        p_notes: input.notes ?? '',
      });
      if (error) throw new Error(translateRpcError(error));
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, addContribution };
}
