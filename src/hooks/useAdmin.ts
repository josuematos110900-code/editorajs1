import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import type { PlanType, SubscriptionStatus } from '../types/database';

export interface AdminMetrics {
  total_users: number;
  free_users: number;
  trialing_users: number;
  premium_active_users: number;
  past_due_users: number;
  canceled_users: number;
  expired_users: number;
  signups_last_30_days: number;
}

export interface AdminBillingMetrics {
  payments_count: number;
  renewals_count: number;
  refunds_count: number;
  chargebacks_count: number;
  failed_count: number;
  revenue_captured: number;
  revenue_currency: string;
}

export interface AdminBillingEventRow {
  id: string;
  provider: string;
  event_type: string;
  status: string;
  amount: number | null;
  currency: string | null;
  user_email: string | null;
  created_at: string;
}

export interface AdminUserRow {
  user_id: string;
  email: string;
  full_name: string;
  country: string;
  currency: string;
  plan: PlanType;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
}

export function useAdminMetrics() {
  const { user } = useAuth();
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['admin_metrics', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_metrics');
      if (error) throw error;
      return data as AdminMetrics | null;
    },
    enabled: !!user && profile?.role === 'admin',
  });
}

export function useAdminUsers() {
  const { user } = useAuth();
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['admin_users', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_users');
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
    enabled: !!user && profile?.role === 'admin',
  });
}

export function useAdminBillingMetrics() {
  const { user } = useAuth();
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['admin_billing_metrics', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_billing_metrics');
      if (error) throw error;
      return data as AdminBillingMetrics | null;
    },
    enabled: !!user && profile?.role === 'admin',
  });
}

export function useAdminBillingEvents() {
  const { user } = useAuth();
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['admin_billing_events', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_billing_events', { p_limit: 50 });
      if (error) throw error;
      return (data ?? []) as AdminBillingEventRow[];
    },
    enabled: !!user && profile?.role === 'admin',
  });
}
