import { api } from '@/lib/axios';

export interface Asset {
  id: string;
  name: string;
  asset_type_id?: string;
  asset_set_id?: string;
  serial_number?: string;
  assigned_user_id?: string;
  location?: string;
  status_id?: string;
  tags?: string[];
  source?: string;
  
  // Financials
  purchase_price?: number;
  purchase_date?: string;
  vendor?: string;
  order_number?: string;
  warranty_end?: string;
  
  extra?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  
  // Expanded relations (optional, depending on backend response)
  asset_type?: AssetType;
  status?: AssetStatus;
  asset_set?: AssetSet;
  assigned_user?: User;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  roles: string[];
}

export interface AssetCreate {
  name: string;
  asset_type_id?: string;
  asset_set_id?: string;
  serial_number?: string;
  location?: string;
  status_id?: string;
  assigned_user_id?: string;
  tags?: string[];
  
  // Financials
  purchase_price?: number;
  purchase_date?: string;
  vendor?: string;
  order_number?: string;
  warranty_end?: string;
  
  extra?: Record<string, any>;
}

export interface AssetUpdate {
  name?: string;
  asset_type_id?: string | null;
  asset_set_id?: string | null;
  serial_number?: string | null;
  assigned_user_id?: string | null;
  location?: string | null;
  status?: string;
  tags?: string[];
  
  // Financials
  purchase_price?: number | null;
  purchase_date?: string | null;
  vendor?: string | null;
  order_number?: string | null;
  warranty_end?: string | null;
  
  extra?: Record<string, any>;
}

export interface AssetSet {
  id: string;
  name: string;
  description?: string;
  created_by_id?: string;
  created_at?: string;
}

export interface AssetSetCreate {
  name: string;
  description?: string;
}

export interface AssetSetUpdate {
  name?: string;
  description?: string;
}

export interface AssetType {
  id: string;
  name: string;
  description?: string;
}

export const CustomFieldTarget = {
  asset: "asset",
  user: "user",
} as const;

export type CustomFieldTarget = typeof CustomFieldTarget[keyof typeof CustomFieldTarget];

export const CustomFieldType = {
  string: "string",
  integer: "integer",
  boolean: "boolean",
  date: "date",
  enum: "enum",
  reference: "reference",
} as const;

export type CustomFieldType = typeof CustomFieldType[keyof typeof CustomFieldType];

export interface CustomFieldDefinition {
  id: string;
  target: CustomFieldTarget;
  key: string;
  label: string;
  field_type: CustomFieldType;
  asset_type_id?: string;
  asset_set_id?: string;
  required: boolean;
  order: number;
  config?: Record<string, any>;
}

export interface CustomFieldDefinitionCreate {
  label: string;
  key: string;
  target: CustomFieldTarget;
  field_type: CustomFieldType;
  asset_type_id?: string;
  asset_set_id?: string;
  required?: boolean;
  order?: number;
  config?: Record<string, any>;
}

export interface CustomFieldDefinitionUpdate {
  label?: string;
  field_type?: CustomFieldType;
  asset_type_id?: string | null;
  asset_set_id?: string | null;
  required?: boolean;
  order?: number;
  config?: Record<string, any>;
}

export const getCustomFields = async () => {
  const { data } = await api.get<CustomFieldDefinition[]>('/custom-fields/');
  return data;
};

export const createCustomField = async (payload: CustomFieldDefinitionCreate) => {
  const { data } = await api.post<CustomFieldDefinition>('/custom-fields/', payload);
  return data;
};

export const updateCustomField = async (id: string, payload: CustomFieldDefinitionUpdate) => {
  const { data } = await api.patch<CustomFieldDefinition>(`/custom-fields/${id}`, payload);
  return data;
};

export const deleteCustomField = async (id: string) => {
  await api.delete(`/custom-fields/${id}`);
};


export interface AssetStatus {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  color?: string; // If backend supports it, otherwise UI mapping
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface GetAssetsParams {
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  asset_set_id?: string;
  assigned_user_id?: string;
  unassigned_set?: boolean;
  status_id?: string;
  asset_type_id?: string;
}

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

export const getAssetHistory = async (assetId: string) => {
  const { data } = await api.get<AuditLog[]>('/audit-logs/', {
    params: {
      entity_type: 'asset',
      entity_id: assetId
    }
  });
  return data;
};

export const getAsset = async (id: string) => {
  const { data } = await api.get<Asset>(`/assets/${id}`);
  return data;
};

export const getAssets = async (params: GetAssetsParams = {}) => {
  const { data } = await api.get<PaginatedResponse<Asset>>('/assets/', { params });
  return data;
};

export const createAsset = async (payload: AssetCreate) => {
  const { data } = await api.post<Asset>('/assets/', payload);
  return data;
};

export const updateAsset = async (id: string, payload: AssetUpdate) => {
  const { data } = await api.patch<Asset>(`/assets/${id}`, payload);
  return data;
};

export const deleteAsset = async (id: string) => {
  await api.delete(`/assets/${id}`);
};

export const bulkDeleteAssets = async (assetIds: string[]) => {
  const { data } = await api.post<{ deleted_count: number }>('/assets/bulk-delete', { asset_ids: assetIds });
  return data;
};

export const getAssetSets = async () => {
  const { data } = await api.get<AssetSet[]>('/asset-sets/');
  return data;
};

export const createAssetSet = async (payload: AssetSetCreate) => {
  const { data } = await api.post<AssetSet>('/asset-sets/', payload);
  return data;
};

export const updateAssetSet = async (id: string, payload: AssetSetUpdate) => {
  const { data } = await api.patch<AssetSet>(`/asset-sets/${id}`, payload);
  return data;
};

export const deleteAssetSet = async (id: string) => {
  await api.delete(`/asset-sets/${id}`);
};

export const getAssetTypes = async () => {
  const { data } = await api.get<AssetType[]>('/asset-types/');
  return data;
};

export const getAssetStatuses = async () => {
  const { data } = await api.get<AssetStatus[]>('/asset-statuses/');
  return data;
};

export const createAssetStatus = async (payload: { key: string; label: string }) => {
  const { data } = await api.post<AssetStatus>('/asset-statuses/', payload);
  return data;
};

export const updateAssetStatus = async (key: string, payload: { label?: string }) => {
  const { data } = await api.patch<AssetStatus>(`/asset-statuses/${key}`, payload);
  return data;
};

export const deleteAssetStatus = async (key: string) => {
  await api.delete(`/asset-statuses/${key}`);
};

export const createAssetType = async (payload: { name: string; description?: string }) => {
  const { data } = await api.post<AssetType>('/asset-types/', payload);
  return data;
};

export const updateAssetType = async (id: string, payload: { name?: string; description?: string }) => {
  const { data } = await api.patch<AssetType>(`/asset-types/${id}`, payload);
  return data;
};

export const deleteAssetType = async (id: string) => {
  await api.delete(`/asset-types/${id}`);
};
