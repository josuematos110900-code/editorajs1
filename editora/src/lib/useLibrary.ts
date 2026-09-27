import { useAuth } from '../context/AuthContext';
import { api } from '../data';
import type { Edition, LibraryItem } from '../types';
import { useAsync } from './useAsync';

/** Biblioteca do cliente com sessão iniciada (vazia para visitantes). */
export function useLibrary() {
  const { profile } = useAuth();
  const result = useAsync<LibraryItem[]>(() => (profile ? api.listMyLibrary() : Promise.resolve([])), [profile?.id]);
  const items = result.data ?? [];
  const ownedFor = (bookId: string): Edition[] => items.filter((i) => i.bookId === bookId).map((i) => i.kind);
  return { ...result, items, ownedFor };
}
