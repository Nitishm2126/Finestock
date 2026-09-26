const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Location {
  id: string;
  name: string;
  code?: string;
  warehouse_id?: string;
  is_active?: boolean;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  is_active: boolean;
  locations_count: number;
  locations?: Location[];
  city?: string;
  stock_units?: number;
  utilization?: number;
  status?: string;
}

import { DEMO_WAREHOUSES, DEMO_LOCATIONS } from '@/lib/demo/data';

export async function fetchLocations(warehouseId: string, token: string): Promise<Location[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    return DEMO_LOCATIONS.filter(l => l.warehouse.id === warehouseId).map(l => ({
      id: l.id,
      name: l.name,
      code: l.id,
      warehouse_id: l.warehouse.id,
    }));
  }

  const res = await fetch(`${API_BASE_URL}/warehouses/${warehouseId}/locations`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.locations || [];
}

export async function fetchWarehouses(token: string): Promise<Warehouse[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return DEMO_WAREHOUSES.map(w => ({
      ...w,
      locations: DEMO_LOCATIONS.filter(l => l.warehouse.id === w.id).map(l => ({
        id: l.id,
        name: l.name,
        code: l.id,
        warehouse_id: w.id,
      }))
    })) as any;
  }

  const res = await fetch(`${API_BASE_URL}/warehouses/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch warehouses');
  const data = await res.json();
  const whs: Warehouse[] = data.warehouses || [];

  // Fetch locations for each warehouse in parallel
  const withLocs = await Promise.all(whs.map(async w => {
    try {
      const locs = await fetchLocations(w.id, token);
      return { ...w, locations: locs };
    } catch {
      return { ...w, locations: [] };
    }
  }));

  return withLocs;
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
