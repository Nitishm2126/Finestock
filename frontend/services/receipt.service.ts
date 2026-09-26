const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface ReceiptLine {
  id: string;
  receipt_id: string;
  product_id: string;
  sku?: string;
  product_name?: string;
  product?: { id?: string; name: string; sku: string };
  expected_quantity: number;
  received_quantity: number;
  destination_location_id?: string;
  destination_location?: { id?: string; name: string };
}

export interface Receipt {
  id: string;
  organization_id?: string;
  receipt_number: string;
  supplier_id: string;
  supplier_name?: string;
  supplier?: { id?: string; name: string; code?: string };
  warehouse_id: string;
  warehouse_name?: string;
  warehouse?: { id?: string; name: string; code?: string };
  destination_location_id: string;
  destination_location_name?: string;
  status: 'DRAFT' | 'WAITING' | 'PARTIAL' | 'DONE' | 'CANCELLED';
  expected_date?: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  lines: ReceiptLine[];
}

const DEMO_STORAGE_KEY = 'fs_demo_receipts';

const DEFAULT_DEMO_RECEIPTS: Receipt[] = [
  {
    id: 'rec-demo-01',
    receipt_number: 'REC-2026-0001',
    supplier_id: 'sup-demo-01',
    supplier_name: 'Apex Semiconductor Corp',
    warehouse_id: 'wh-1',
    warehouse_name: 'Chennai Main Hub',
    destination_location_id: 'loc-1',
    destination_location_name: 'A-01 Bulk Pallets',
    status: 'DONE',
    expected_date: new Date(Date.now() - 2 * 86400000).toISOString(),
    reference_number: 'PO-2026-904',
    notes: 'Q3 Chipset restock arrived intact',
    version: 2,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    lines: [
      {
        id: 'rl-1',
        receipt_id: 'rec-demo-01',
        product_id: 'prod-1',
        sku: 'ELEC-WKB-001',
        product_name: 'Pro Mechanical Keyboard',
        expected_quantity: 50,
        received_quantity: 50,
      },
    ],
  },
  {
    id: 'rec-demo-02',
    receipt_number: 'REC-2026-0002',
    supplier_id: 'sup-demo-02',
    supplier_name: 'Global Display Solutions',
    warehouse_id: 'wh-2',
    warehouse_name: 'Bangalore Distribution Center',
    destination_location_id: 'loc-3',
    destination_location_name: 'B-03 Display Racks',
    status: 'WAITING',
    expected_date: new Date(Date.now() + 86400000).toISOString(),
    reference_number: 'PO-2026-912',
    notes: 'Awaiting truck customs clearance',
    version: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    lines: [
      {
        id: 'rl-2',
        receipt_id: 'rec-demo-02',
        product_id: 'prod-2',
        sku: 'ELEC-MOU-002',
        product_name: 'Ergonomic Wireless Mouse',
        expected_quantity: 100,
        received_quantity: 0,
      },
    ],
  },
];

function getDemoReceipts(): Receipt[] {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_RECEIPTS));
      return DEFAULT_DEMO_RECEIPTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DEMO_RECEIPTS;
  }
}

function saveDemoReceipts(receipts: Receipt[]) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(receipts));
  } catch {}
}

export async function fetchReceipts(
  token?: string,
  params?: { warehouse_id?: string; supplier_id?: string; status?: string; search?: string }
): Promise<Receipt[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    let list = getDemoReceipts();
    if (params?.warehouse_id) list = list.filter(r => r.warehouse_id === params.warehouse_id);
    if (params?.supplier_id) list = list.filter(r => r.supplier_id === params.supplier_id);
    if (params?.status) list = list.filter(r => r.status === params.status);
    if (params?.search) {
      const s = params.search.toLowerCase();
      list = list.filter(
        r =>
          r.receipt_number.toLowerCase().includes(s) ||
          (r.reference_number && r.reference_number.toLowerCase().includes(s)) ||
          (r.supplier_name && r.supplier_name.toLowerCase().includes(s))
      );
    }
    return list;
  }

  const queryParams = new URLSearchParams();
  if (params?.warehouse_id) queryParams.set('warehouse_id', params.warehouse_id);
  if (params?.supplier_id) queryParams.set('supplier_id', params.supplier_id);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.search) queryParams.set('search', params.search);

  const res = await fetch(`${API_BASE_URL}/receipts/?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch receipts');
  const data = await res.json();
  return data.receipts;
}

export async function fetchReceipt(token: string | undefined, receiptId: string): Promise<Receipt> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoReceipts();
    const r = list.find(item => item.id === receiptId);
    if (!r) throw new Error('Receipt not found');
    return r;
  }

  const res = await fetch(`${API_BASE_URL}/receipts/${receiptId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch receipt');
  return res.json();
}

export async function createReceipt(
  arg1?: any,
  arg2?: any
): Promise<Receipt> {
  const token = (typeof arg1 === 'string' && (arg1.startsWith('eyJ') || arg1.length > 50)) ? arg1 : (typeof arg2 === 'string' ? arg2 : undefined);
  const payload = typeof arg1 === 'object' ? arg1 : arg2;

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoReceipts();
    const newReceipt: Receipt = {
      ...payload,
      id: `rec-demo-${Date.now()}`,
      receipt_number: `REC-2026-${String(list.length + 1).padStart(4, '0')}`,
      status: 'WAITING',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lines: payload.lines.map((l: any, idx: number) => ({
        ...l,
        id: `rl-demo-${Date.now()}-${idx}`,
        receipt_id: `rec-demo-${Date.now()}`,
        received_quantity: 0,
      })),
    };
    saveDemoReceipts([newReceipt, ...list]);
    return newReceipt;
  }

  const res = await fetch(`${API_BASE_URL}/receipts/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create receipt');
  }
  return res.json();
}

export async function validateReceipt(
  arg1?: any,
  arg2?: any,
  arg3?: any
): Promise<Receipt> {
  let token: string | undefined;
  let receiptId: string;
  let req: any;

  if (typeof arg1 === 'string' && (arg1.startsWith('eyJ') || arg1.length > 50)) {
    token = arg1;
    receiptId = arg2;
    req = arg3;
  } else {
    receiptId = arg1;
    req = arg2?.lines ? arg2 : { lines: arg2 };
    token = arg3;
  }

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoReceipts();
    const updated = list.map(r => {
      if (r.id === receiptId) {
        return {
          ...r,
          status: 'DONE' as const,
          version: r.version + 1,
          updated_at: new Date().toISOString(),
          lines: r.lines.map(l => ({ ...l, received_quantity: l.expected_quantity })),
        };
      }
      return r;
    });
    saveDemoReceipts(updated);
    const item = updated.find(r => r.id === receiptId);
    if (!item) throw new Error('Receipt not found');
    return item;
  }

  const res = await fetch(`${API_BASE_URL}/receipts/${receiptId}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(req || {}),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to validate receipt');
  }
  return res.json();
}

export async function cancelReceipt(arg1?: string, arg2?: string): Promise<Receipt> {
  const token = (arg1 && (arg1.startsWith('eyJ') || arg1.length > 50)) ? arg1 : arg2;
  const receiptId = (arg1 && (arg1.startsWith('eyJ') || arg1.length > 50)) ? arg2 || '' : arg1 || '';

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoReceipts();
    const updated = list.map(r =>
      r.id === receiptId ? { ...r, status: 'CANCELLED' as const, updated_at: new Date().toISOString() } : r
    );
    saveDemoReceipts(updated);
    const item = updated.find(r => r.id === receiptId);
    if (!item) throw new Error('Receipt not found');
    return item;
  }

  const res = await fetch(`${API_BASE_URL}/receipts/${receiptId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to cancel receipt');
  }
  return res.json();
}

