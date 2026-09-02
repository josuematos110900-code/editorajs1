import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Account, AccountBalance } from '../types/database';
import { translateRpcError } from '../lib/rpcErrors';

export function useAccounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('archived', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Account[];
    },
    enabled: !!user,
  });
}

export function useAccountBalances() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['account_balances', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('account_balances').select('*');
      if (error) throw error;
      return data as AccountBalance[];
    },
    enabled: !!user,
  });
}

export function useAccountMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['accounts', user?.id] });
    qc.invalidateQueries({ queryKey: ['account_balances', user?.id] });
  };

  const create = useMutation({
    mutationFn: async (input: Pick<Account, 'name' | 'type' | 'initial_balance' | 'color' | 'icon'>) => {
      if (!user) throw new Error('Não autenticado');
      // Passa por uma RPC (não insert direto): o limite do plano Free (2
      // contas) e a identidade do utilizador são verificados no servidor,
      // não apenas no frontend.
      const { error } = await supabase.rpc('create_account', {
        p_name: input.name,
        p_type: input.type,
        p_initial_balance: input.initial_balance,
        p_color: input.color,
        p_icon: input.icon,
      });
      if (error) throw new Error(translateRpcError(error));
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Account> }) => {
      const { error } = await supabase.from('accounts').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').update({ archived: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
