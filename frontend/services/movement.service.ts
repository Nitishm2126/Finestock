const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Movement {
  id: string;
  timestamp: string;
  product_id: string;
  sku: string;
  product_name: string;
  warehouse_id?: string;
  warehouse_name?: string;
  location_id: string;
  location_name: string;
  transaction_type: string;
  event_type?: string;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  quantity_delta: number;
  quantity_before: number;
  quantity_after: number;
  balance_after?: number;
  actor_name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

export type MovementEvent = Movement;

export interface MovementFilterParams {
  product_id?: string;
  warehouse_id?: string;
  location_id?: string;
  transaction_type?: string;
  event_type?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

const DEFAULT_DEMO_MOVEMENTS: Movement[] = [
  {
    id: 'mov-demo-01',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    product_id: 'prod-1',
    sku: 'ELEC-WKB-001',
    product_name: 'Pro Mechanical Keyboard',
    warehouse_name: 'Chennai Main Hub',
    location_id: 'loc-1',
    location_name: 'A-01 Bulk Pallets',
    transaction_type: 'RECEIPT_IN',
    reference_type: 'RECEIPT',
    reference_id: 'REC-2026-0001',
    quantity_delta: 50,
    quantity_before: 70,
    quantity_after: 120,
    actor_name: 'Warehouse Inbound',
  },
  {
    id: 'mov-demo-02',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    product_id: 'prod-1',
    sku: 'ELEC-WKB-001',
    product_name: 'Pro Mechanical Keyboard',
    warehouse_name: 'Chennai Main Hub',
    location_id: 'loc-1',
    location_name: 'A-01 Bulk Pallets',
    transaction_type: 'TRANSFER_OUT',
    reference_type: 'TRANSFER',
    reference_id: 'TRF-2026-0001',
    quantity_delta: -25,
    quantity_before: 95,
    quantity_after: 70,
    actor_name: 'Internal Logistics',
  },
  {
    id: 'mov-demo-03',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    product_id: 'prod-2',
    sku: 'ELEC-MOU-002',
    product_name: 'Ergonomic Wireless Mouse',
    warehouse_name: 'Bangalore Distribution Center',
    location_id: 'loc-3',
    location_name: 'B-03 Display Racks',
    transaction_type: 'DELIVERY_OUT',
    reference_type: 'DELIVERY',
    reference_id: 'DEL-2026-0002',
    quantity_delta: -20,
    quantity_before: 80,
    quantity_after: 60,
    actor_name: 'Shipping Dispatch',
  },
  {
    id: 'mov-demo-04',
    timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
    product_id: 'prod-1',
    sku: 'ELEC-WKB-001',
    product_name: 'Pro Mechanical Keyboard',
    warehouse_name: 'Chennai Main Hub',
    location_id: 'loc-1',
    location_name: 'A-01 Bulk Pallets',
    transaction_type: 'ADJUSTMENT',
    reference_type: 'ADJUSTMENT',
    reference_id: 'ADJ-2026-0001',
    quantity_delta: 2,
    quantity_before: 93,
    quantity_after: 95,
    actor_name: 'Audit Supervisor',
  },
];

export async function fetchMovements(
  token?: string,
  params?: MovementFilterParams
): Promise<Movement[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    let list = [...DEFAULT_DEMO_MOVEMENTS];
    if (params?.product_id) list = list.filter(m => m.product_id === params.product_id);
    const type = params?.event_type || params?.transaction_type;
    if (type && type !== 'ALL') {
      list = list.filter(m => m.transaction_type === type || m.event_type === type);
    }
    if (params?.search) {
      const s = params.search.toLowerCase();
      list = list.filter(
        m =>
          m.sku.toLowerCase().includes(s) ||
          m.product_name.toLowerCase().includes(s) ||
          (m.reference_id && m.reference_id.toLowerCase().includes(s))
      );
    }
    return list.map(m => ({
      ...m,
      event_type: m.event_type || m.transaction_type,
      balance_after: m.balance_after ?? m.quantity_after,
    }));
  }

  const queryParams = new URLSearchParams();
  if (params?.product_id) queryParams.set('product_id', params.product_id);
  if (params?.warehouse_id) queryParams.set('warehouse_id', params.warehouse_id);
  if (params?.location_id) queryParams.set('location_id', params.location_id);
  const typeParam = params?.event_type || params?.transaction_type;
  if (typeParam && typeParam !== 'ALL') queryParams.set('transaction_type', typeParam);
  if (params?.search) queryParams.set('search', params.search);
  if (params?.limit) queryParams.set('limit', String(params.limit));
  if (params?.skip) queryParams.set('skip', String(params.skip));

  const res = await fetch(`${API_BASE_URL}/movements/?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch movements');
  const data = await res.json();
  return (data.movements || []).map((m: any) => ({
    ...m,
    event_type: m.event_type || m.transaction_type,
    reference_number: m.reference_id,
    balance_after: m.balance_after ?? m.quantity_after,
  }));
}
