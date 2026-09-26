// Fine Stock frontend core type definitions

export * from './auth';

export interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: string;
  active?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  database?: string;
  data?: T;
  services?: Record<string, string>;
}
