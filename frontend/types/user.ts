export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export interface User {
  id: string;
  organization_id: string;
  role_id: string;
  role: Role;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
}

export interface CreateUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role_id: string;
  is_active?: boolean;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  role_id?: string;
  is_active?: boolean;
}
