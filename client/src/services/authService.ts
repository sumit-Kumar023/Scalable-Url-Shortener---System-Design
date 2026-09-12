import { api } from './api';
import { User } from '../types';

export async function registerRequest(name: string, email: string, password: string): Promise<User> {
  const res = await api.post('/auth/register', { name, email, password });
  return res.data.data.user;
}

export async function loginRequest(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await api.post('/auth/login', { email, password });
  return res.data.data;
}

export async function meRequest(): Promise<User> {
  const res = await api.get('/auth/me');
  return res.data.data.user;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}
