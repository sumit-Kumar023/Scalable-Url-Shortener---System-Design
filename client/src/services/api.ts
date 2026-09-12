import axios, { AxiosError } from 'axios';

// In development the Vite dev server proxies `/api` to the backend (see
// vite.config.ts / README). In production the app is served behind Nginx,
// which proxies `/api` to the backend container - so a relative base URL
// works in both environments without extra configuration.
export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
    return axiosErr.response?.data?.error?.message ?? axiosErr.message ?? 'Something went wrong';
  }
  return 'Something went wrong';
}
