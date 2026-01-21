import { api } from '@/lib/axios';

export interface Integration {
  id: string;
  type: string; // "jamf", "intune", "google", "ldap", "scim"
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationCreate {
  type: string;
  name: string;
  enabled?: boolean;
  config: Record<string, any>;
}

export interface IntegrationUpdate {
  name?: string;
  enabled?: boolean;
  config?: Record<string, any>;
}

export const getIntegrations = async () => {
  const { data } = await api.get<Integration[]>('/integrations/');
  return data;
};

export const createIntegration = async (payload: IntegrationCreate) => {
  const { data } = await api.post<Integration>('/integrations/', payload);
  return data;
};

export const updateIntegration = async (id: string, payload: IntegrationUpdate) => {
  const { data } = await api.patch<Integration>(`/integrations/${id}`, payload);
  return data;
};

export const deleteIntegration = async (id: string) => {
  await api.delete(`/integrations/${id}`);
};




