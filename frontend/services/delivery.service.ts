const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface DeliveryLine {
  id: string;
  delivery_id: string;
  product_id: string;
  sku?: string;
  product_name?: string;
  product?: { id?: string; name: string; sku: string };
  requested_quantity: number;
  reserved_quantity: number;
  picked_quantity: number;
  packed_quantity: number;
  delivered_quantity: number;
  source_location_id?: string;
  location?: { id?: string; name: string };
}

export interface DeliveryOrder {
  id: string;
  organization_id?: string;
  delivery_number: string;
  customer_name: string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse?: { id?: string; name: string; code?: string };
  source_location_id: string;
  source_location_name?: string;
  destination_address?: string;
  status:
    | 'DRAFT'
    | 'WAITING'
    | 'PICKING'
    | 'PICKED'
    | 'PACKING'
    | 'PACKED'
    | 'READY'
    | 'DELIVERED'
    | 'CANCELLED';
  scheduled_date?: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT' | string;
  notes?: string;
  created_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  lines: DeliveryLine[];
}

const DEMO_STORAGE_KEY = 'fs_demo_deliveries';

const DEFAULT_DEMO_DELIVERIES: DeliveryOrder[] = [
  {
    id: 'del-demo-01',
    delivery_number: 'DEL-2026-0001',
    customer_name: 'Omni Retail Partners',
    warehouse_id: 'wh-1',
    warehouse_name: 'Chennai Main Hub',
    source_location_id: 'loc-1',
    source_location_name: 'A-01 Bulk Pallets',
    status: 'WAITING',
    scheduled_date: new Date(Date.now() + 86400000).toISOString(),
    priority: 'HIGH',
    notes: 'Urgent weekend store replenishment',
    version: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    lines: [
      {
        id: 'dl-1',
        delivery_id: 'del-demo-01',
        product_id: 'prod-1',
        sku: 'ELEC-WKB-001',
        product_name: 'Pro Mechanical Keyboard',
        requested_quantity: 15,
        reserved_quantity: 15,
        picked_quantity: 0,
        packed_quantity: 0,
        delivered_quantity: 0,
      },
    ],
  },
  {
    id: 'del-demo-02',
    delivery_number: 'DEL-2026-0002',
    customer_name: 'TechDirect eCommerce',
    warehouse_id: 'wh-2',
    warehouse_name: 'Bangalore Distribution Center',
    source_location_id: 'loc-3',
    source_location_name: 'B-03 Display Racks',
    status: 'DELIVERED',
    scheduled_date: new Date(Date.now() - 86400000).toISOString(),
    priority: 'NORMAL',
    notes: 'Completed standard carrier pickup',
    version: 3,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    lines: [
      {
        id: 'dl-2',
        delivery_id: 'del-demo-02',
        product_id: 'prod-2',
        sku: 'ELEC-MOU-002',
        product_name: 'Ergonomic Wireless Mouse',
        requested_quantity: 20,
        reserved_quantity: 0,
        picked_quantity: 20,
        packed_quantity: 20,
        delivered_quantity: 20,
      },
    ],
  },
];

function getDemoDeliveries(): DeliveryOrder[] {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_DELIVERIES));
      return DEFAULT_DEMO_DELIVERIES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DEMO_DELIVERIES;
  }
}

function saveDemoDeliveries(deliveries: DeliveryOrder[]) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(deliveries));
  } catch {}
}

export async function fetchDeliveries(
  token?: string,
  params?: { warehouse_id?: string; status?: string; priority?: string; search?: string }
): Promise<DeliveryOrder[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    let list = getDemoDeliveries();
    if (params?.warehouse_id) list = list.filter(d => d.warehouse_id === params.warehouse_id);
    if (params?.status) list = list.filter(d => d.status === params.status);
    if (params?.priority) list = list.filter(d => d.priority === params.priority);
    if (params?.search) {
      const s = params.search.toLowerCase();
      list = list.filter(
        d =>
          d.delivery_number.toLowerCase().includes(s) ||
          d.customer_name.toLowerCase().includes(s)
      );
    }
    return list;
  }

  const queryParams = new URLSearchParams();
  if (params?.warehouse_id) queryParams.set('warehouse_id', params.warehouse_id);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.priority) queryParams.set('priority', params.priority);
  if (params?.search) queryParams.set('search', params.search);

  const res = await fetch(`${API_BASE_URL}/deliveries/?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch delivery orders');
  const data = await res.json();
  return data.deliveries;
}

export async function fetchDelivery(token: string | undefined, deliveryId: string): Promise<DeliveryOrder> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoDeliveries();
    const d = list.find(item => item.id === deliveryId);
    if (!d) throw new Error('Delivery order not found');
    return d;
  }

  const res = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch delivery order');
  return res.json();
}

export async function createDelivery(
  arg1?: any,
  arg2?: any
): Promise<DeliveryOrder> {
  const token = (typeof arg1 === 'string' && (arg1.startsWith('eyJ') || arg1.length > 50)) ? arg1 : (typeof arg2 === 'string' ? arg2 : undefined);
  const payload = typeof arg1 === 'object' ? arg1 : arg2;

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoDeliveries();
    const newDelivery: DeliveryOrder = {
      ...payload,
      id: `del-demo-${Date.now()}`,
      delivery_number: `DEL-2026-${String(list.length + 1).padStart(4, '0')}`,
      status: 'WAITING',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lines: payload.lines.map((l: any, idx: number) => ({
        ...l,
        id: `dl-demo-${Date.now()}-${idx}`,
        delivery_id: `del-demo-${Date.now()}`,
        reserved_quantity: 0,
        picked_quantity: 0,
        packed_quantity: 0,
        delivered_quantity: 0,
      })),
    };
    saveDemoDeliveries([newDelivery, ...list]);
    return newDelivery;
  }

  const res = await fetch(`${API_BASE_URL}/deliveries/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create delivery order');
  }
  return res.json();
}

function resolveTokenAndId(a?: string, b?: string): { token?: string; deliveryId: string } {
  if (a && (a.startsWith('eyJ') || a.length > 50)) {
    return { token: a, deliveryId: b || '' };
  }
  return { deliveryId: a || '', token: b };
}

export async function reserveDelivery(arg1?: string, arg2?: string): Promise<DeliveryOrder> {
  const { token, deliveryId } = resolveTokenAndId(arg1, arg2);
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoDeliveries();
    const updated = list.map(d => {
      if (d.id === deliveryId) {
        return {
          ...d,
          lines: d.lines.map(l => ({ ...l, reserved_quantity: l.requested_quantity })),
          updated_at: new Date().toISOString(),
          version: d.version + 1,
        };
      }
      return d;
    });
    saveDemoDeliveries(updated);
    const item = updated.find(d => d.id === deliveryId);
    if (!item) throw new Error('Delivery not found');
    return item;
  }

  const res = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}/reserve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    if (err.error?.message) {
      throw new Error(err.error.message);
    }
    throw new Error(err.detail || 'Failed to reserve delivery');
  }
  return res.json();
}

export async function pickDelivery(
  arg1?: string,
  arg2?: any,
  arg3?: any
): Promise<DeliveryOrder> {
  let token: string | undefined;
  let deliveryId: string;
  let req: any;

  if (typeof arg1 === 'string' && (arg1.startsWith('eyJ') || arg1.length > 50)) {
    token = arg1;
    deliveryId = arg2;
    req = arg3;
  } else {
    deliveryId = arg1 || '';
    req = arg2?.lines ? arg2 : { lines: arg2 };
    token = arg3;
  }

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoDeliveries();
    const updated = list.map(d => {
      if (d.id === deliveryId) {
        return {
          ...d,
          status: 'PICKED' as const,
          lines: d.lines.map(l => ({ ...l, picked_quantity: l.requested_quantity })),
          updated_at: new Date().toISOString(),
          version: d.version + 1,
        };
      }
      return d;
    });
    saveDemoDeliveries(updated);
    const item = updated.find(d => d.id === deliveryId);
    if (!item) throw new Error('Delivery not found');
    return item;
  }

  const res = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}/pick`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(req || {}),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || err.error?.message || 'Failed to pick items');
  }
  return res.json();
}

export async function packDelivery(
  arg1?: string,
  arg2?: any,
  arg3?: any
): Promise<DeliveryOrder> {
  let token: string | undefined;
  let deliveryId: string;
  let req: any;

  if (typeof arg1 === 'string' && (arg1.startsWith('eyJ') || arg1.length > 50)) {
    token = arg1;
    deliveryId = arg2;
    req = arg3;
  } else {
    deliveryId = arg1 || '';
    req = arg2?.lines ? arg2 : { lines: arg2 };
    token = arg3;
  }

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoDeliveries();
    const updated = list.map(d => {
      if (d.id === deliveryId) {
        return {
          ...d,
          status: 'READY' as const,
          lines: d.lines.map(l => ({ ...l, packed_quantity: l.requested_quantity })),
          updated_at: new Date().toISOString(),
          version: d.version + 1,
        };
      }
      return d;
    });
    saveDemoDeliveries(updated);
    const item = updated.find(d => d.id === deliveryId);
    if (!item) throw new Error('Delivery not found');
    return item;
  }

  const res = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}/pack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(req || {}),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to pack items');
  }
  return res.json();
}

export async function deliverDelivery(arg1?: string, arg2?: string): Promise<DeliveryOrder> {
  const { token, deliveryId } = resolveTokenAndId(arg1, arg2);
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoDeliveries();
    const updated = list.map(d => {
      if (d.id === deliveryId) {
        return {
          ...d,
          status: 'DELIVERED' as const,
          lines: d.lines.map(l => ({
            ...l,
            delivered_quantity: l.requested_quantity,
            reserved_quantity: 0,
          })),
          updated_at: new Date().toISOString(),
          version: d.version + 1,
        };
      }
      return d;
    });
    saveDemoDeliveries(updated);
    const item = updated.find(d => d.id === deliveryId);
    if (!item) throw new Error('Delivery not found');
    return item;
  }

  const res = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}/deliver`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || err.detail || 'Failed to complete delivery');
  }
  return res.json();
}

export async function cancelDelivery(arg1?: string, arg2?: string): Promise<DeliveryOrder> {
  const { token, deliveryId } = resolveTokenAndId(arg1, arg2);
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoDeliveries();
    const updated = list.map(d =>
      d.id === deliveryId
        ? {
            ...d,
            status: 'CANCELLED' as const,
            lines: d.lines.map(l => ({ ...l, reserved_quantity: 0 })),
            updated_at: new Date().toISOString(),
          }
        : d
    );
    saveDemoDeliveries(updated);
    const item = updated.find(d => d.id === deliveryId);
    if (!item) throw new Error('Delivery not found');
    return item;
  }

  const res = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to cancel delivery');
  }
  return res.json();
}

export const deliverOrder = deliverDelivery;
export const pickDeliveryLine = (deliveryId: string, lineMap: Record<string, number>, token?: string) =>
  pickDelivery(deliveryId, lineMap, token);


