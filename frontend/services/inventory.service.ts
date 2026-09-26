const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface StockPosition {
  product_id: string;
  sku: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  location_id: string;
  location_name: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
}

import { DEMO_INVENTORY } from '@/lib/demo/data';

export async function fetchInventory(token: string): Promise<StockPosition[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return DEMO_INVENTORY.map(inv => ({
      product_id: inv.product.id,
      sku: inv.product.sku,
      product_name: inv.product.name,
      warehouse_id: inv.location.warehouse.id,
      warehouse_name: inv.location.warehouse.name,
      location_id: inv.location.id,
      location_name: inv.location.name,
      quantity: inv.quantity,
      reserved_quantity: inv.reserved_quantity,
      available_quantity: inv.quantity - inv.reserved_quantity,
    }));
  }

  const res = await fetch(`${API_BASE_URL}/inventory/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch inventory');
  const data = await res.json();
  return data.positions;
}
