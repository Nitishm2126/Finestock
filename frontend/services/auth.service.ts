import { AuthResponse, CurrentUserResponse, LoginPayload, RegisterPayload } from '@/types';
import { isDemoLogin, handleDemoLogin, isDemoToken, handleDemoGetMe } from '@/lib/auth/demoAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const TOKEN_STORAGE_KEY = 'fine_stock_access_token';

/**
 * Session storage adapter.
 * Uses browser localStorage for client-side session management.
 * In a future phase, this can be swapped with backend-set HttpOnly cookies.
 */
export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  set: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  remove: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: jsonStringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.detail || data.message || 'Registration failed';
    throw new Error(errorMsg);
  }

  if (data.access_token) {
    tokenStorage.set(data.access_token);
  }

  return data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  // DEMO ONLY interception
  if (payload.email === 'admin@finestock.demo') {
    if (isDemoLogin(payload)) {
      const data = handleDemoLogin();
      tokenStorage.set(data.access_token);
      return data;
    } else {
      throw new Error('Invalid demo credentials.');
    }
  }

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: jsonStringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.detail || data.message || 'Invalid email or password';
    throw new Error(errorMsg);
  }

  if (data.access_token) {
    tokenStorage.set(data.access_token);
  }

  return data;
}

export async function getMe(): Promise<CurrentUserResponse> {
  const token = tokenStorage.get();
  if (!token) {
    throw new Error('No authentication token found');
  }

  // DEMO ONLY interception
  if (isDemoToken(token)) {
    return handleDemoGetMe();
  }

  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (res.status === 401) {
    tokenStorage.remove();
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to retrieve user profile');
  }

  return data;
}

export function logout(): void {
  tokenStorage.remove();
}

function jsonStringify(data: unknown): string {
  return JSON.stringify(data);
}
