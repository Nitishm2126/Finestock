// Fine Stock API client service
import { ApiResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function fetchHealth(): Promise<ApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`API returned status ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message || 'Failed to connect to Fine Stock API',
      services: {
        backend: 'disconnected',
        supabase: 'unknown',
      },
    };
  }
}
