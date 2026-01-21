import { api } from '@/lib/axios';

export interface DashboardStats {
  total_assets: number;
  total_value?: number;
  status_counts: Record<string, number>;
  type_counts: Record<string, number>;
  location_counts: Record<string, number>;
  request_stats: {
    open: number;
    in_progress: number;
    total: number;
  };
  recent_assets: {
    id: string;
    name: string;
    type: string;
    created_at: string;
  }[];
  recent_activity: {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    timestamp: string;
    user_name: string;
    entity_name?: string;
    changes?: Record<string, any>;
    origin?: string;
  }[];
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get<DashboardStats>('/dashboard/stats');
  return data;
};

