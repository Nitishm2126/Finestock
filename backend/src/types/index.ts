// Fine Stock backend type definitions
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  services?: Record<string, string>;
}
