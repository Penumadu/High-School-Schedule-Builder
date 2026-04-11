import { auth } from './firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 
                 (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:8000/api/v1');

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};

  const token = user?.getIdToken ? await user.getIdToken() : 'mock-token';
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const { method = 'GET', body, headers = {} } = options;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { ...authHeaders, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiUpload(
  endpoint: string,
  file: File,
  params: Record<string, string> = {}
): Promise<unknown> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';

  const formData = new FormData();
  formData.append('file', file);

  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Convenience methods
export const api = {
  get: <T = unknown>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T = unknown>(endpoint: string, body: unknown) =>
    apiRequest<T>(endpoint, { method: 'POST', body }),
  put: <T = unknown>(endpoint: string, body: unknown) =>
    apiRequest<T>(endpoint, { method: 'PUT', body }),
  delete: <T = unknown>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
  upload: apiUpload,
};
