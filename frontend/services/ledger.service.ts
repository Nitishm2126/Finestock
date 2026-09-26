import { DEMO_LEDGER } from '@/lib/demo/data';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface LedgerEntry {
  id: string;
  timestamp: string;
  product: string;
  sku: string;
  operation_id: string;
  type: string;
  quantity: number;
  before: number;
  after: number;
  warehouse: string;
  location: string;
  performed_by: string;
  reason: string;
  reference: string;
}

export async function fetchLedger(token: string): Promise<LedgerEntry[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return DEMO_LEDGER as any;
  }

  const res = await fetch(`${API_BASE_URL}/ledger/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error('Failed to fetch ledger');
  }
  const data = await res.json();
  return data.entries || [];
}
