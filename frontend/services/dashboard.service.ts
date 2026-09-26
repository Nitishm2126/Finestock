const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface DashboardSummary {
  total_products: number;
  active_products: number;
  total_warehouses: number;
  total_locations: number;
  total_stock_units: number;
  low_stock_products: number;
  out_of_stock_products: number;
  active_users?: number;
  physical_stock?: number;
  reserved_stock?: number;
  available_stock?: number;
  inventory_accuracy?: number;
  stock_status?: {
    healthy: number;
    low: number;
    critical: number;
    out: number;
  };
}

import { DEMO_DASHBOARD_SUMMARY } from '@/lib/demo/data';

export async function fetchDashboardSummary(token: string): Promise<DashboardSummary> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return DEMO_DASHBOARD_SUMMARY;
  }

  const res = await fetch(`${API_BASE_URL}/dashboard/summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch dashboard summary');
  }

  return res.json();
}
