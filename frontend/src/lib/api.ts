import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:8000/api/v1');

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Wait for auth to initialize if needed
  let user = auth.currentUser;

  if (!user) {

    // Wait up to 2 seconds for auth to initialize
    user = await new Promise((resolve) => {
      // Modular syntax: onAuthStateChanged(auth, callback)
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        unsubscribe();
        resolve(u);
      });
      setTimeout(() => {
        if (typeof unsubscribe === 'function') unsubscribe();
        resolve(auth.currentUser);
      }, 2000);
    });
  }

  if (!user) return {};

  const token = await user.getIdToken();
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

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: { ...authHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Firebase Quota Exceeded (Daily Limit Reached). Please try again later.");
      }

      const errorBody = await response.json().catch(() => ({ detail: 'Request failed' }));
      let message = 'Request failed';
    
    if (typeof errorBody.detail === 'string') {
      message = errorBody.detail;
    } else if (Array.isArray(errorBody.detail)) {
      // Handle FastAPI validation errors (list of objects)
      message = errorBody.detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join(', ');
    } else if (errorBody.detail && typeof errorBody.detail === 'object') {
      message = JSON.stringify(errorBody.detail);
    } else {
      message = `HTTP ${response.status}`;
    }
    
    throw new Error(message);
  }

    return response.json() as Promise<T>;
  } catch (error: any) {
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      console.error('Network Error or CORS Block:', error);
      throw new Error('Connection to the server failed. This may be due to a server crash or a Firebase quota limit being reached.');
    }
    throw error;
  }
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
