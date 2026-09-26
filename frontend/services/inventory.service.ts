const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface StockPosition {
  product_id: string;
  sku: string;
  product_name: string;
  category_name?: string;
  warehouse_id: string;
  warehouse_name: string;
  location_id: string;
  location_name: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  incoming_quantity: number;
  outgoing_quantity: number;
  risk: 'Healthy' | 'Low Stock' | 'Critical' | string;
  updated_at?: string;
}

export interface StockTimelineItem {
  id: string;
  timestamp: string;
  transaction_type: string;
  reference_type?: string;
  reference_id?: string;
  quantity_delta: number;
  quantity_before: number;
  quantity_after: number;
  location_name: string;
  warehouse_name: string;
  actor_name: string;
  notes?: string;
}

export interface StockTimelineResponse {
  product_id: string;
  sku: string;
  product_name: string;
  current_physical: number;
  current_reserved: number;
  current_available: number;
  timeline: StockTimelineItem[];
}

export interface InventoryFilterParams {
  search?: string;
  warehouse_id?: string;
  location_id?: string;
  low_stock?: boolean;
  out_of_stock?: boolean;
}

import { DEMO_INVENTORY } from '@/lib/demo/data';

export async function fetchInventory(token: string, filters?: InventoryFilterParams): Promise<StockPosition[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    let result: StockPosition[] = DEMO_INVENTORY.map(inv => {
      const avail = inv.quantity - inv.reserved_quantity;
      let risk: string = 'Healthy';
      if (avail <= 0) risk = 'Critical';
      else if (avail < 20) risk = 'Low Stock';

      return {
        product_id: inv.product.id,
        sku: inv.product.sku,
        product_name: inv.product.name,
        category_name: 'Standard Hardware',
        warehouse_id: inv.location.warehouse.id,
        warehouse_name: inv.location.warehouse.name,
        location_id: inv.location.id,
        location_name: inv.location.name,
        quantity: inv.quantity,
        reserved_quantity: inv.reserved_quantity,
        available_quantity: avail,
        incoming_quantity: 50,
        outgoing_quantity: 15,
        risk,
        updated_at: new Date().toISOString(),
      };
    });

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(r => r.product_name.toLowerCase().includes(s) || r.sku.toLowerCase().includes(s) || r.location_name.toLowerCase().includes(s));
    }
    if (filters?.low_stock) {
      result = result.filter(r => r.risk === 'Low Stock' || r.risk === 'Critical');
    }
    if (filters?.out_of_stock) {
      result = result.filter(r => r.available_quantity <= 0);
    }
    return result;
  }

  const queryParams = new URLSearchParams();
  if (filters?.search) queryParams.set('search', filters.search);
  if (filters?.warehouse_id) queryParams.set('warehouse_id', filters.warehouse_id);
  if (filters?.location_id) queryParams.set('location_id', filters.location_id);
  if (filters?.low_stock) queryParams.set('low_stock', 'true');
  if (filters?.out_of_stock) queryParams.set('out_of_stock', 'true');

  const url = `${API_BASE_URL}/inventory/?${queryParams.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch inventory');
  const data = await res.json();
  return data.positions || [];
}

export async function fetchProductTimeline(productId: string, token: string): Promise<StockTimelineResponse> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return {
      product_id: productId,
      sku: 'SKU-DEMO-001',
      product_name: 'Wireless Ergonomic Keyboard',
      current_physical: 120,
      current_reserved: 30,
      current_available: 90,
      timeline: [
        {
          id: 'tl-1',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          transaction_type: 'RECEIPT_IN',
          reference_type: 'receipt',
          reference_id: 'REC-2026-0001',
          quantity_delta: 50,
          quantity_before: 70,
          quantity_after: 120,
          location_name: 'Bin A-01-01',
          warehouse_name: 'Main Distribution Hub',
          actor_name: 'Admin User',
          notes: 'Standard PO Receipt from Supplier'
        },
        {
          id: 'tl-2',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          transaction_type: 'TRANSFER_IN',
          reference_type: 'transfer',
          reference_id: 'TRF-2026-0001',
          quantity_delta: 20,
          quantity_before: 50,
          quantity_after: 70,
          location_name: 'Bin A-01-01',
          warehouse_name: 'Main Distribution Hub',
          actor_name: 'Inventory Manager',
          notes: 'Inter-warehouse rebalancing'
        }
      ]
    };
  }

  const res = await fetch(`${API_BASE_URL}/inventory/${productId}/timeline`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch product timeline');
  return await res.json();
}
