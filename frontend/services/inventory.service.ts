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

export async function fetchInventory(token: string): Promise<StockPosition[]> {
  const res = await fetch(`${API_BASE_URL}/inventory/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch inventory');
  const data = await res.json();
  return data.positions;
}
