import axios from 'axios';
import { toast } from 'sonner';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status >= 500) {
      // Skip global toast for AI chat endpoint as it handles its own errors
      if (!error.config?.url?.includes('/ai/chat')) {
        toast.error('Server Error', {
          description: 'Something went wrong on the server. Please try again later.'
        });
      }
    }
    return Promise.reject(error);
  }
);


