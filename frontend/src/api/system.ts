import { api } from '@/lib/axios';

export interface SystemStatus {
  initialized: boolean;
}

export interface SetupRequest {
  admin_email: string;
  admin_password: string;
  admin_full_name?: string;
  seed_data: boolean;
}

export const getSystemStatus = async (): Promise<SystemStatus> => {
  const { data } = await api.get<SystemStatus>('/system/status');
  return data;
};

export const setupSystem = async (payload: SetupRequest): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>('/system/setup', payload);
  return data;
};

