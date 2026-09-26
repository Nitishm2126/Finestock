const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  is_active: boolean;
  locations_count: number;
  city?: string;
  stock_units?: number;
  utilization?: number;
  status?: string;
}

import { DEMO_WAREHOUSES } from '@/lib/demo/data';

export async function fetchWarehouses(token: string): Promise<Warehouse[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return DEMO_WAREHOUSES as any;
  }

  const res = await fetch(`${API_BASE_URL}/warehouses/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch warehouses');
  const data = await res.json();
  return data.warehouses;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createWarehouse(token: string, data: any): Promise<Warehouse> {
  const res = await fetch(`${API_BASE_URL}/warehouses/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create warehouse');
  }
  return res.json();
}
