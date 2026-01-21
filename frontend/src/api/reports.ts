import { api } from '@/lib/axios';

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

export interface ActivityVolume {
  date: string;
  count: number;
}

export interface ActionTypeDistribution {
  name: string;
  value: number;
}

export interface ReportStats {
  activity_volume: ActivityVolume[];
  action_types: ActionTypeDistribution[];
}

export interface GetLogsParams {
  page?: number;
  size?: number;
  entity_type?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface FinancialSummary {
  total_valuation: number;
  current_month_total: number;
  previous_month_total: number;
  change_percentage: number;
}

export interface SpendByCategory {
  type: string;
  total: number;
}

export interface SpendByVendor {
  vendor: string;
  total: number;
}

export interface SpendingTrend {
  period: string;
  total: number;
}

export interface FinancialReport {
  summary: FinancialSummary;
  spend_by_category: SpendByCategory[];
  spend_by_vendor: SpendByVendor[];
  spending_trends: SpendingTrend[];
}

export const getReportStats = async () => {
  const { data } = await api.get<ReportStats>('/reports/stats');
  return data;
};

export const getFinancialStats = async () => {
  const { data } = await api.get<FinancialReport>('/reports/financials');
  return data;
};

export const getAuditLogs = async (params: GetLogsParams) => {
  const queryParams = {
    skip: ((params.page || 1) - 1) * (params.size || 50),
    limit: params.size || 50,
    entity_type: params.entity_type,
    user_id: params.user_id,
    start_date: params.start_date,
    end_date: params.end_date,
  };
  
  const response = await api.get<AuditLog[]>('/audit-logs/', { params: queryParams });
  const total = parseInt(response.headers['x-total-count'] || '0', 10);
  
  return {
    items: response.data,
    total: total || response.data.length // Fallback if header missing
  };
};

export const exportData = async (entityType: string, fields: string[], filters?: any) => {
  const response = await api.post(`/reports/export/${entityType}`, { fields, filters }, {
    responseType: 'blob', // Important for file download
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  
  // Try to get filename from header or default
  const contentDisposition = response.headers['content-disposition'];
  let fileName = `${entityType}_export.csv`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) fileName = match[1];
  }
  
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
