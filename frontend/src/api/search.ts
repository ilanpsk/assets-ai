import { api } from '@/lib/axios';
import type { Asset, User, AuditLog } from './assets';

export interface GlobalSearchResult {
  assets: Asset[];
  users: User[];
  logs: AuditLog[];
}

export const searchGlobal = async (query: string) => {
  const { data } = await api.get<GlobalSearchResult>('/search/global', { 
    params: { q: query } 
  });
  return data;
};

