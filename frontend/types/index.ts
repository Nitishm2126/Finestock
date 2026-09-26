// Fine Stock frontend core type definitions

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
  data?: T;
  services?: Record<string, string>;
}
