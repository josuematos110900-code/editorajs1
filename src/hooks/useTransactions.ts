import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Transaction } from '../types/database';
import { translateRpcError } from '../lib/rpcErrors';

export interface TransactionFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  type?: Transaction['type'];
  search?: string;
}

export function useTransactions(filters: TransactionFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['transactions', user?.id, filters],
    queryFn: async () => {
      let query = supabase.from('transactions').select('*').order('date', { ascending: false });
      if (filters.from) query = query.gte('date', filters.from);
      if (filters.to) query = query.lte('date', filters.to);
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
      if (filters.accountId) query = query.eq('account_id', filters.accountId);
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.search) query = query.ilike('description', `%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });
}

type NewTransaction = Pick<
  Transaction,
  'type' | 'description' | 'amount' | 'category_id' | 'account_id' | 'date' | 'notes' | 'transfer_to_account_id'
>;

export function useTransactionMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['transactions', user?.id] });
    qc.invalidateQueries({ queryKey: ['account_balances', user?.id] });
  };

  const create = useMutation({
    mutationFn: async (input: NewTransaction) => {
      if (!user) throw new Error('Não autenticado');
      if (input.amount <= 0) throw new Error('O valor deve ser maior que zero.');
      const { error } = await supabase.from('transactions').insert({ ...input, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<NewTransaction> }) => {
      if (patch.amount !== undefined && patch.amount <= 0) {
        throw new Error('O valor deve ser maior que zero.');
      }
      const { error } = await supabase.from('transactions').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /**
   * Transferência entre contas: passa pela RPC transfer_between_accounts em
   * vez de um insert direto — valida no servidor que as duas contas
   * pertencem ao utilizador, que origem ≠ destino, e bloqueia as duas
   * linhas (FOR UPDATE) para nunca deixar o estado parcialmente atualizado.
   */
  const transfer = useMutation({
    mutationFn: async (input: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      date: string;
      description?: string;
    }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.rpc('transfer_between_accounts', {
        p_from_account_id: input.fromAccountId,
        p_to_account_id: input.toAccountId,
        p_amount: input.amount,
        p_date: input.date,
        p_description: input.description ?? 'Transferência',
      });
      if (error) throw new Error(translateRpcError(error));
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, transfer };
}
