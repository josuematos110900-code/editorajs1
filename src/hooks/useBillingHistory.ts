import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { BillingHistoryEntry } from '../types/database';

/**
 * Histórico de pagamentos do próprio utilizador — Fase 11. Passa sempre
 * pela RPC get_my_billing_history() (supabase/migrations/003_billing_engine.sql),
 * que já filtra por auth.uid() e nunca devolve o payload cru do webhook.
 */
export function useBillingHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['billing_history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_billing_history', { p_limit: 50 });
      if (error) throw error;
      return (data ?? []) as BillingHistoryEntry[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
