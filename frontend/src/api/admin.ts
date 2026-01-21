import { api } from '@/lib/axios';

export interface SystemSetting {
  key: string;
  value: any;
  is_secure: boolean;
  description?: string;
  updated_at: string;
}

export interface SystemSettingUpdate {
  value: any;
  is_secure?: boolean;
  description?: string;
}

export interface Snapshot {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  entity_counts: Record<string, number>;
  schema_name: string;
  is_active: boolean;
}

export interface SnapshotCreate {
  name: string;
  description?: string;
}

export const getSystemSettings = async (): Promise<SystemSetting[]> => {
  const { data } = await api.get<SystemSetting[]>('/admin/settings');
  return data;
};

export const updateSystemSetting = async (key: string, payload: SystemSettingUpdate): Promise<SystemSetting> => {
  const { data } = await api.put<SystemSetting>(`/admin/settings/${key}`, payload);
  return data;
};

export const getSnapshots = async (): Promise<Snapshot[]> => {
  const { data } = await api.get<Snapshot[]>('/snapshots');
  return data;
};

export const createSnapshot = async (payload: SnapshotCreate): Promise<Snapshot> => {
  const { data } = await api.post<Snapshot>('/snapshots', payload);
  return data;
};

export const rollbackSnapshot = async (id: string): Promise<any> => {
  const { data } = await api.post(`/snapshots/${id}/rollback`);
  return data;
};

export const deleteSnapshot = async (id: string): Promise<void> => {
  await api.delete(`/snapshots/${id}`);
};

export const exportSnapshot = async (id: string): Promise<Blob> => {
  const { data } = await api.get(`/snapshots/${id}/export`, {
    responseType: 'blob'
  });
  return data;
};
