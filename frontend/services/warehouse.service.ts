const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  is_active: boolean;
  location_count: number;
}

export async function fetchWarehouses(token: string): Promise<Warehouse[]> {
  const res = await fetch(`${API_BASE_URL}/warehouses/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch warehouses');
  const data = await res.json();
  return data.warehouses;
}

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
