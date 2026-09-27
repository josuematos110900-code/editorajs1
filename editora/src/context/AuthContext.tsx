import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../data';
import type { Profile } from '../types';

interface AuthValue {
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setProfile(await api.getCurrentProfile());
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return api.onAuthChange(() => void refresh());
  }, [refresh]);

  const signOut = useCallback(async () => {
    await api.signOut();
    setProfile(null);
  }, []);

  return <AuthContext.Provider value={{ profile, loading, refresh, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora de AuthProvider');
  return ctx;
}
