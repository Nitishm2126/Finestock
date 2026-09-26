import { DEMO_OPERATIONS } from '@/lib/demo/data';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface Operation {
  id: string;
  type: string;
  product: string;
  quantity: number;
  source: string;
  destination: string;
  warehouse: string;
  created_by: string;
  date: string;
  status: string;
}

export async function fetchOperations(token: string): Promise<Operation[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return DEMO_OPERATIONS as any;
  }

  const res = await fetch(`${API_BASE_URL}/operations/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error('Failed to fetch operations');
  }
  const data = await res.json();
  return data.operations || [];
}
