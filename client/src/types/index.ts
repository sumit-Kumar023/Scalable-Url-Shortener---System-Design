export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface ShortUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  customAlias: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  clickCount: number;
  createdAt: string;
  lastClickedAt: string | null;
  isActive: boolean;
}

export interface UrlAnalytics {
  id: string;
  shortCode: string;
  shortUrl: string;
  totalClicks: number;
  lastClickedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}
