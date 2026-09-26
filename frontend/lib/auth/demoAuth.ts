// DEMO ONLY — replace with real authentication before production.
import { AuthResponse, CurrentUserResponse, LoginPayload } from '@/types';

export const DEMO_TOKEN = 'demo-token-12345';
export const DEMO_CREDENTIALS = {
  email: 'admin@finestock.demo',
  password: 'FineStock@123',
};

export const DEMO_USER = {
  id: 'demo-admin-001',
  organization_id: 'demo-org-001',
  first_name: 'Fine',
  last_name: 'Stock Admin',
  email: 'admin@finestock.demo',
  role: 'ADMIN',
  is_demo: true,
};

export function isDemoLogin(payload: LoginPayload): boolean {
  return payload.email === DEMO_CREDENTIALS.email && payload.password === DEMO_CREDENTIALS.password;
}

export function handleDemoLogin(): AuthResponse {
  return {
    success: true,
    access_token: DEMO_TOKEN,
    token_type: 'bearer',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: DEMO_USER as any,
  };
}

export function isDemoToken(token: string | null): boolean {
  return token === DEMO_TOKEN;
}

export function handleDemoGetMe(): CurrentUserResponse {
  return {
    success: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: DEMO_USER as any,
  };
}
