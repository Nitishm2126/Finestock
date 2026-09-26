const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Adjustment {
  id: string;
  organization_id?: string;
  adjustment_number: string;
  warehouse_id: string;
  warehouse_name?: string;
  location_id: string;
  location_name?: string;
  product_id: string;
  sku?: string;
  product_name?: string;
  system_quantity: number;
  physical_count: number;
  difference: number;
  reason: 'COUNT_CORRECTION' | 'DAMAGE' | 'SHRINKAGE' | 'FOUND_STOCK' | 'DATA_ERROR' | 'EXPIRY' | 'OTHER';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  notes?: string;
  requested_by?: string;
  approved_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

const DEMO_STORAGE_KEY = 'fs_demo_adjustments';

const DEFAULT_DEMO_ADJUSTMENTS: Adjustment[] = [
  {
    id: 'adj-demo-01',
    adjustment_number: 'ADJ-2026-0001',
    warehouse_id: 'wh-1',
    warehouse_name: 'Chennai Main Hub',
    location_id: 'loc-1',
    location_name: 'A-01 Bulk Pallets',
    product_id: 'prod-1',
    sku: 'ELEC-WKB-001',
    product_name: 'Pro Mechanical Keyboard',
    system_quantity: 48,
    physical_count: 50,
    difference: 2,
    reason: 'FOUND_STOCK',
    status: 'APPROVED',
    notes: 'Found extra unopened box during monthly cycle count',
    version: 2,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'adj-demo-02',
    adjustment_number: 'ADJ-2026-0002',
    warehouse_id: 'wh-2',
    warehouse_name: 'Bangalore Distribution Center',
    location_id: 'loc-3',
    location_name: 'B-03 Display Racks',
    product_id: 'prod-2',
    sku: 'ELEC-MOU-002',
    product_name: 'Ergonomic Wireless Mouse',
    system_quantity: 60,
    physical_count: 58,
    difference: -2,
    reason: 'DAMAGE',
    status: 'PENDING_APPROVAL',
    notes: 'Forklift bump caused packaging water damage',
    version: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

function getDemoAdjustments(): Adjustment[] {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_ADJUSTMENTS));
      return DEFAULT_DEMO_ADJUSTMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DEMO_ADJUSTMENTS;
  }
}

function saveDemoAdjustments(adjustments: Adjustment[]) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(adjustments));
  } catch {}
}

export async function fetchAdjustments(
  token?: string,
  params?: {
    warehouse_id?: string;
    location_id?: string;
    product_id?: string;
    status?: string;
    reason?: string;
    search?: string;
  }
): Promise<Adjustment[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    let list = getDemoAdjustments();
    if (params?.warehouse_id) list = list.filter(a => a.warehouse_id === params.warehouse_id);
    if (params?.location_id) list = list.filter(a => a.location_id === params.location_id);
    if (params?.product_id) list = list.filter(a => a.product_id === params.product_id);
    if (params?.status) list = list.filter(a => a.status === params.status);
    if (params?.reason) list = list.filter(a => a.reason === params.reason);
    if (params?.search) {
      const s = params.search.toLowerCase();
      list = list.filter(
        a =>
          a.adjustment_number.toLowerCase().includes(s) ||
          (a.sku && a.sku.toLowerCase().includes(s)) ||
          (a.product_name && a.product_name.toLowerCase().includes(s))
      );
    }
    return list;
  }

  const queryParams = new URLSearchParams();
  if (params?.warehouse_id) queryParams.set('warehouse_id', params.warehouse_id);
  if (params?.location_id) queryParams.set('location_id', params.location_id);
  if (params?.product_id) queryParams.set('product_id', params.product_id);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.reason) queryParams.set('reason', params.reason);
  if (params?.search) queryParams.set('search', params.search);

  const res = await fetch(`${API_BASE_URL}/adjustments/?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch adjustments');
  const data = await res.json();
  return data.adjustments;
}

export async function createAdjustment(
  token: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
): Promise<Adjustment> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoAdjustments();
    const systemQty = payload.system_quantity || 50;
    const diff = payload.physical_count - systemQty;
    const newAdj: Adjustment = {
      ...payload,
      id: `adj-demo-${Date.now()}`,
      adjustment_number: `ADJ-2026-${String(list.length + 1).padStart(4, '0')}`,
      system_quantity: systemQty,
      difference: diff,
      status: 'PENDING_APPROVAL',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveDemoAdjustments([newAdj, ...list]);
    return newAdj;
  }

  const res = await fetch(`${API_BASE_URL}/adjustments/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create adjustment');
  }
  return res.json();
}

export async function approveAdjustment(token: string | undefined, adjustmentId: string): Promise<Adjustment> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoAdjustments();
    const updated = list.map(a =>
      a.id === adjustmentId
        ? { ...a, status: 'APPROVED' as const, version: a.version + 1, updated_at: new Date().toISOString() }
        : a
    );
    saveDemoAdjustments(updated);
    const item = updated.find(a => a.id === adjustmentId);
    if (!item) throw new Error('Adjustment not found');
    return item;
  }

  const res = await fetch(`${API_BASE_URL}/adjustments/${adjustmentId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to approve adjustment');
  }
  return res.json();
}

export async function cancelAdjustment(token: string | undefined, adjustmentId: string): Promise<Adjustment> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoAdjustments();
    const updated = list.map(a =>
      a.id === adjustmentId
        ? { ...a, status: 'CANCELLED' as const, updated_at: new Date().toISOString() }
        : a
    );
    saveDemoAdjustments(updated);
    const item = updated.find(a => a.id === adjustmentId);
    if (!item) throw new Error('Adjustment not found');
    return item;
  }

  const res = await fetch(`${API_BASE_URL}/adjustments/${adjustmentId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to cancel adjustment');
  }
  return res.json();
}
