import { User, UserListResponse, CreateUserPayload, UpdateUserPayload, Role } from '@/types/user';
import { DEMO_USERS, DEMO_ROLES } from '@/lib/demo/data';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

class UserService {
  private getHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getUsers(skip = 0, limit = 100): Promise<UserListResponse> {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { users: DEMO_USERS as any, total: DEMO_USERS.length };
    }
    const res = await fetch(`${API_URL}/users/?skip=${skip}&limit=${limit}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to fetch users');
    }
    return res.json();
  }

  async getRoles(): Promise<Role[]> {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return DEMO_ROLES as any;
    }
    const res = await fetch(`${API_URL}/users/roles`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to fetch roles');
    }
    return res.json();
  }

  async createUser(payload: CreateUserPayload): Promise<User> {
    const res = await fetch(`${API_URL}/users/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to create user');
    }
    return res.json();
  }

  async updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to update user');
    }
    return res.json();
  }
}

export const userService = new UserService();

// Convenience function export
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchUsers(_token?: string): Promise<any[]> {
  const result = await userService.getUsers();
  return result.users;
}
