import { api } from '@/lib/axios';
import type { Asset } from './assets';

export type RequestStatus = 'open' | 'in_progress' | 'closed';
export type RequestType = 'new_asset' | 'assigned_asset' | 'other';

export interface Requester {
  id: string;
  email: string;
  full_name?: string;
}

export interface Request {
  id: string;
  requester_id: string;
  requester?: Requester;
  title: string;
  description: string | null;
  status: RequestStatus;
  request_type: RequestType;
  asset_id?: string | null;
  asset?: Asset;
  created_at: string;
  updated_at: string;
}

export interface CreateRequestPayload {
  title: string;
  description?: string;
  status?: RequestStatus;
  request_type?: RequestType;
  asset_id?: string;
}

export interface UpdateRequestPayload {
  title?: string;
  description?: string;
  status?: RequestStatus;
  request_type?: RequestType;
  asset_id?: string;
}

export interface GetRequestsParams {
  page?: number;
  size?: number;
  status?: string;
  request_type?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface RequestsResponse {
  items: Request[];
  total: number;
}

export const getRequests = async (params: GetRequestsParams = {}): Promise<RequestsResponse> => {
  const queryParams = {
    skip: ((params.page || 1) - 1) * (params.size || 50),
    limit: params.size || 50,
    status: params.status,
    request_type: params.request_type,
    start_date: params.start_date,
    end_date: params.end_date,
    search: params.search,
  };

  const response = await api.get('/requests', { params: queryParams });
  const total = parseInt(response.headers['x-total-count'] || '0', 10);
  
  return {
    items: response.data,
    total: total || response.data.length
  };
};

export const getRequest = async (id: string): Promise<Request> => {
  const response = await api.get(`/requests/${id}`);
  return response.data;
};

export const createRequest = async (data: CreateRequestPayload): Promise<Request> => {
  const response = await api.post('/requests', data);
  return response.data;
};

export const updateRequest = async (id: string, data: UpdateRequestPayload): Promise<Request> => {
  const response = await api.patch(`/requests/${id}`, data);
  return response.data;
};

export const deleteRequest = async (id: string): Promise<void> => {
  await api.delete(`/requests/${id}`);
};
