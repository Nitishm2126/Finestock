const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface TransferLine {
  id: string;
  transfer_id: string;
  product_id: string;
  sku?: string;
  product_name?: string;
  product?: { name: string; sku: string };
  quantity: number;
}

export interface Transfer {
  id: string;
  organization_id?: string;
  transfer_number: string;
  source_warehouse_id: string;
  source_warehouse_name?: string;
  source_warehouse?: { name: string; code?: string };
  source_location_id: string;
  source_location_name?: string;
  source_location?: { name: string; code?: string };
  destination_warehouse_id: string;
  destination_warehouse_name?: string;
  destination_warehouse?: { name: string; code?: string };
  destination_location_id: string;
  destination_location_name?: string;
  destination_location?: { name: string; code?: string };
  status: 'DRAFT' | 'REQUESTED' | 'APPROVED' | 'IN_TRANSIT' | 'DONE' | 'CANCELLED';
  reason: string;
  requested_by?: string;
  approved_by?: string;
  notes?: string;
  version: number;
  created_at: string;
  updated_at: string;
  lines: TransferLine[];
}

const DEMO_STORAGE_KEY = 'fs_demo_transfers';

const DEFAULT_DEMO_TRANSFERS: Transfer[] = [
  {
    id: 'trf-demo-01',
    transfer_number: 'TRF-2026-0001',
    source_warehouse_id: 'wh-1',
    source_warehouse_name: 'Chennai Main Hub',
    source_location_id: 'loc-1',
    source_location_name: 'A-01 Bulk Pallets',
    destination_warehouse_id: 'wh-2',
    destination_warehouse_name: 'Bangalore Distribution Center',
    destination_location_id: 'loc-3',
    destination_location_name: 'B-03 Display Racks',
    status: 'DONE',
    reason: 'Stock replenishment for South Region',
    version: 2,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    lines: [
      {
        id: 'tl-1',
        transfer_id: 'trf-demo-01',
        product_id: 'prod-1',
        sku: 'ELEC-WKB-001',
        product_name: 'Pro Mechanical Keyboard',
        quantity: 25,
      },
    ],
  },
  {
    id: 'trf-demo-02',
    transfer_number: 'TRF-2026-0002',
    source_warehouse_id: 'wh-1',
    source_warehouse_name: 'Chennai Main Hub',
    source_location_id: 'loc-2',
    source_location_name: 'A-02 High Density Racks',
    destination_warehouse_id: 'wh-1',
    destination_warehouse_name: 'Chennai Main Hub',
    destination_location_id: 'loc-1',
    destination_location_name: 'A-01 Bulk Pallets',
    status: 'REQUESTED',
    reason: 'Internal rack relocation for fast picking',
    version: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    lines: [
      {
        id: 'tl-2',
        transfer_id: 'trf-demo-02',
        product_id: 'prod-2',
        sku: 'ELEC-MOU-002',
        product_name: 'Ergonomic Wireless Mouse',
        quantity: 40,
      },
    ],
  },
];

function getDemoTransfers(): Transfer[] {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_TRANSFERS));
      return DEFAULT_DEMO_TRANSFERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DEMO_TRANSFERS;
  }
}

function saveDemoTransfers(transfers: Transfer[]) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(transfers));
  } catch {}
}

export async function fetchTransfers(
  token?: string,
  params?: {
    source_warehouse_id?: string;
    destination_warehouse_id?: string;
    status?: string;
    search?: string;
  }
): Promise<Transfer[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    let list = getDemoTransfers();
    if (params?.source_warehouse_id) list = list.filter(t => t.source_warehouse_id === params.source_warehouse_id);
    if (params?.destination_warehouse_id) list = list.filter(t => t.destination_warehouse_id === params.destination_warehouse_id);
    if (params?.status) list = list.filter(t => t.status === params.status);
    if (params?.search) {
      const s = params.search.toLowerCase();
      list = list.filter(
        t =>
          t.transfer_number.toLowerCase().includes(s) ||
          t.reason.toLowerCase().includes(s)
      );
    }
    return list;
  }

  const queryParams = new URLSearchParams();
  if (params?.source_warehouse_id) queryParams.set('source_warehouse_id', params.source_warehouse_id);
  if (params?.destination_warehouse_id) queryParams.set('destination_warehouse_id', params.destination_warehouse_id);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.search) queryParams.set('search', params.search);

  const res = await fetch(`${API_BASE_URL}/transfers/?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch transfers');
  const data = await res.json();
  return data.transfers;
}

export async function createTransfer(
  arg1?: any,
  arg2?: any
): Promise<Transfer> {
  const token = (typeof arg1 === 'string' && (arg1.startsWith('eyJ') || arg1.length > 50)) ? arg1 : (typeof arg2 === 'string' ? arg2 : undefined);
  const payload = typeof arg1 === 'object' ? arg1 : arg2;

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoTransfers();
    const newTrf: Transfer = {
      ...payload,
      id: `trf-demo-${Date.now()}`,
      transfer_number: `TRF-2026-${String(list.length + 1).padStart(4, '0')}`,
      status: 'REQUESTED',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lines: payload.lines.map((l: any, idx: number) => ({
        ...l,
        id: `tl-demo-${Date.now()}-${idx}`,
        transfer_id: `trf-demo-${Date.now()}`,
      })),
    };
    saveDemoTransfers([newTrf, ...list]);
    return newTrf;
  }

  const res = await fetch(`${API_BASE_URL}/transfers/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create transfer');
  }
  return res.json();
}

export async function approveTransfer(arg1?: string, arg2?: string): Promise<Transfer> {
  const token = (arg1 && (arg1.startsWith('eyJ') || arg1.length > 50)) ? arg1 : arg2;
  const transferId = (arg1 && (arg1.startsWith('eyJ') || arg1.length > 50)) ? arg2 || '' : arg1 || '';

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoTransfers();
    const updated = list.map(t =>
      t.id === transferId
        ? { ...t, status: 'APPROVED' as const, version: t.version + 1, updated_at: new Date().toISOString() }
        : t
    );
    saveDemoTransfers(updated);
    const item = updated.find(t => t.id === transferId);
    if (!item) throw new Error('Transfer not found');
    return item;
  }

  const res = await fetch(`${API_BASE_URL}/transfers/${transferId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to approve transfer');
  }
  return res.json();
}

export async function executeTransfer(arg1?: string, arg2?: string): Promise<Transfer> {
  const token = (arg1 && (arg1.startsWith('eyJ') || arg1.length > 50)) ? arg1 : arg2;
  const transferId = (arg1 && (arg1.startsWith('eyJ') || arg1.length > 50)) ? arg2 || '' : arg1 || '';

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoTransfers();
    const updated = list.map(t =>
      t.id === transferId
        ? { ...t, status: 'DONE' as const, version: t.version + 1, updated_at: new Date().toISOString() }
        : t
    );
    saveDemoTransfers(updated);
    const item = updated.find(t => t.id === transferId);
    if (!item) throw new Error('Transfer not found');
    return item;
  }

  const res = await fetch(`${API_BASE_URL}/transfers/${transferId}/execute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to execute transfer');
  }
  return res.json();
}

export async function cancelTransfer(arg1?: string, arg2?: string): Promise<Transfer> {
  const token = (arg1 && (arg1.startsWith('eyJ') || arg1.length > 50)) ? arg1 : arg2;
  const transferId = (arg1 && (arg1.startsWith('eyJ') || arg1.length > 50)) ? arg2 || '' : arg1 || '';

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoTransfers();
    const updated = list.map(d =>
      d.id === transferId
        ? { ...d, status: 'CANCELLED' as const, updated_at: new Date().toISOString() }
        : d
    );
    saveDemoTransfers(updated);
    const item = updated.find(d => d.id === transferId);
    if (!item) throw new Error('Transfer not found');
    return item;
  }

  const res = await fetch(`${API_BASE_URL}/transfers/${transferId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to cancel transfer');
  }
  return res.json();
}

