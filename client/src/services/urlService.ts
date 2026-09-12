import { api } from './api';
import { ShortUrl, UrlAnalytics } from '../types';

export interface CreateUrlPayload {
  originalUrl: string;
  customAlias?: string;
  expiresAt?: string;
}

export async function createUrlRequest(payload: CreateUrlPayload): Promise<ShortUrl> {
  const res = await api.post('/urls', payload);
  return res.data.data;
}

export async function listUrlsRequest(): Promise<ShortUrl[]> {
  const res = await api.get('/urls');
  return res.data.data;
}

export async function deleteUrlRequest(id: string): Promise<void> {
  await api.delete(`/urls/${id}`);
}

export async function getUrlAnalyticsRequest(id: string): Promise<UrlAnalytics> {
  const res = await api.get(`/urls/${id}/analytics`);
  return res.data.data;
}
