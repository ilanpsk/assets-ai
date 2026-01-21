import { api } from '@/lib/axios';

export interface ImportConfig {
  allowed_extensions: string[];
  max_upload_mb: number | null;
}

export const getImportConfig = async (): Promise<ImportConfig> => {
  const { data } = await api.get<ImportConfig>('/imports/config');
  return data;
};

export const uploadImportFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/imports/assets', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const analyzeImport = async (jobId: string, type: 'asset' | 'user' = 'asset', useAi: boolean = false) => {
  const { data } = await api.post(`/imports/${jobId}/analyze`, null, {
    params: { type, use_ai: useAi }
  });
  return data;
};

export const executeImport = async (jobId: string, payload: { strategy: string; options: any; type: string }) => {
  const { data } = await api.post(`/imports/${jobId}/execute`, { ...payload, job_id: jobId });
  return data;
};

export const getJobStatus = async (jobId: string) => {
  const { data } = await api.get(`/imports/jobs/${jobId}`);
  return data;
};
