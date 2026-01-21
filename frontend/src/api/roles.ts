import { api } from '@/lib/axios';

export interface Permission {
  slug: string;
  description: string;
}

export interface Role {
  name: string;
  description?: string;
  permissions: Permission[];
}

export const getRoles = async (): Promise<Role[]> => {
  const { data } = await api.get<Role[]>('/roles/');
  return data;
};

export const getPermissions = async (): Promise<Permission[]> => {
  const { data } = await api.get<Permission[]>('/roles/permissions');
  return data;
};

export const createRole = async (name: string, description?: string): Promise<Role> => {
  const { data } = await api.post<Role>('/roles/', { name, description });
  return data;
};

export const updateRolePermissions = async (roleName: string, permissions: string[]): Promise<Role> => {
  const { data } = await api.put<Role>(`/roles/${roleName}/permissions`, { permissions });
  return data;
};

export const deleteRole = async (roleName: string): Promise<void> => {
  await api.delete(`/roles/${roleName}`);
};







