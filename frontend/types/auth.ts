export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  organization_id: string;
  is_active: boolean;
}

export interface AuthResponse {
  success: boolean;
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface CurrentUserResponse {
  success: boolean;
  user: AuthUser;
}

export interface RegisterPayload {
  organization_name: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
