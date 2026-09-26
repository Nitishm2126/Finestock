const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  uom_id: string;
  reorder_point: number;
  reorder_quantity: number;
  is_active: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  category: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uom: any;
}

export async function fetchProducts(token: string): Promise<Product[]> {
  const res = await fetch(`${API_BASE_URL}/products/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch products');
  const data = await res.json();
  return data.products;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createProduct(token: string, data: any): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/products/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create product');
  }
  return res.json();
}
