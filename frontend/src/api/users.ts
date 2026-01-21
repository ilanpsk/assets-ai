import { api } from '@/lib/axios';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  roles: string[];
  employment_end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserCreate {
  email: string;
  full_name?: string;
  password?: string;
  roles?: string[]; // Defaults to ["user"] if omitted
  employment_end_date?: string;
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  password?: string;
  is_active?: boolean;
  roles?: string[];
  employment_end_date?: string | null;
}

export interface GetUsersParams {
  roles?: string[];
  page?: number;
  size?: number;
  search?: string;
}

export interface UsersResponse {
  items: User[];
  total: number;
}

export const getUsers = async (params: GetUsersParams = {}): Promise<UsersResponse> => {
  const query = new URLSearchParams();
  if (params.roles) {
    params.roles.forEach(role => query.append('roles', role));
  }
  
  const skip = ((params.page || 1) - 1) * (params.size || 50);
  query.append('skip', skip.toString());
  query.append('limit', (params.size || 50).toString());
  
  if (params.search) {
    query.append('search', params.search);
  }

  const response = await api.get<User[]>(`/users/?${query.toString()}`);
  const total = parseInt(response.headers['x-total-count'] || '0', 10);

  return {
    items: response.data,
    total: total || response.data.length
  };
};

export const getUser = async (id: string) => {
  const { data } = await api.get<User>(`/users/${id}`);
  return data;
};

export const createUser = async (payload: UserCreate) => {
  const { data } = await api.post<User>('/users/', payload);
  return data;
};

export const updateUser = async (id: string, payload: UserUpdate) => {
  const { data } = await api.patch<User>(`/users/${id}`, payload);
  return data;
};

export const deleteUser = async (id: string) => {
  await api.delete(`/users/${id}`);
};

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, any>;
  user_id?: string;
  timestamp: string;
  user_name?: string;
  entity_name?: string;
  origin?: string;
}

export const getUserHistory = async (userId: string) => {
  const { data } = await api.get<AuditLog[]>('/audit-logs/', {
    params: {
      entity_type: 'user',
      entity_id: userId
    }
  });
  return data;
};
