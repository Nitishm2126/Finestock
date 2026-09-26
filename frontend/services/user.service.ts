import { User, UserListResponse, CreateUserPayload, UpdateUserPayload, Role } from '@/types/user';

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
