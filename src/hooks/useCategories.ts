import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Category, TransactionType } from '../types/database';

export function useCategories(type?: TransactionType) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['categories', user?.id, type ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('categories').select('*').order('name', { ascending: true });
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user,
  });
}

export function useCategoryMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories', user?.id] });

  const create = useMutation({
    mutationFn: async (input: Pick<Category, 'name' | 'type' | 'icon' | 'color'>) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('categories').insert({ ...input, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, remove };
}
