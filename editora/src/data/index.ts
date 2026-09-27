import type { Api } from './api';
import { createDemoApi } from './demoApi';
import { createSupabaseApi, isSupabaseConfigured } from './supabaseApi';

/**
 * Modo demonstração: só quando o Supabase não está configurado E estamos em
 * desenvolvimento (ou VITE_DEMO_MODE=true explicitamente). Um build de
 * produção sem Supabase NÃO cai silenciosamente em modo demo — mostra um
 * erro de configuração (ver App.tsx).
 */
export const demoMode =
  !isSupabaseConfigured && (import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true');

export const configurationMissing = !isSupabaseConfigured && !demoMode;

export const api: Api = isSupabaseConfigured ? createSupabaseApi() : createDemoApi();

export { ApiError } from './api';
export type * from './api';
