import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Profile } from '../types/database';

interface ProfileContextValue {
  profile: Profile | null;
  isLoading: boolean;
  /**
   * true só quando o utilizador está autenticado, a busca já terminou, e
   * mesmo assim não existe nenhuma linha em "profiles" para ele — nunca
   * deveria acontecer num fluxo normal (o registo cria o perfil
   * automaticamente), mas acontece se a conta foi criada no Supabase Auth
   * antes do schema estar aplicado, ou diretamente pelo painel do
   * Supabase sem passar pelo registo da app.
   */
  profileMissing: boolean;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isFetching } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      // maybeSingle() em vez de single(): se por algum motivo não existir
      // nenhuma linha em "profiles" para este utilizador autenticado,
      // devolve null em vez de rebentar com 406 — o que antes deixava a
      // app presa num spinner infinito sem nenhuma mensagem de erro.
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
    enabled: !!user,
    // Se o perfil ainda não existir (ex: mesmo instante a seguir ao
    // registo, antes do trigger do Postgres terminar), tenta mais
    // algumas vezes antes de assumir que está mesmo em falta.
    retry: (failureCount, err) => !!err && failureCount < 2,
    retryDelay: 1000,
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  async function updateProfile(patch: Partial<Profile>) {
    await mutation.mutateAsync(patch);
  }

  const profileMissing = !!user && !isLoading && !isFetching && !profile;

  return (
    <ProfileContext.Provider value={{ profile: profile ?? null, isLoading, profileMissing, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile deve ser usado dentro de um ProfileProvider');
  return ctx;
}
