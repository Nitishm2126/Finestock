const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface OperationalAlert {
  id: string;
  organization_id: string;
  alert_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  reference_type?: string;
  reference_id?: string;
  is_acknowledged: boolean;
  created_at: string;
}

const DEMO_ALERTS: OperationalAlert[] = [
  {
    id: 'alt-1',
    organization_id: 'org-1',
    alert_type: 'LOW_STOCK',
    severity: 'WARNING',
    title: 'Low Stock Alert',
    message: 'Wireless Mouse (SKU: TECH-WM-002) is below reorder threshold (12 left, threshold 20).',
    reference_type: 'product',
    reference_id: 'p-2',
    is_acknowledged: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'alt-2',
    organization_id: 'org-1',
    alert_type: 'OUT_OF_STOCK',
    severity: 'CRITICAL',
    title: 'Out of Stock Alert',
    message: 'USB-C Multiport Hub (SKU: ACC-USB-HUB) has 0 units available in Main Warehouse.',
    reference_type: 'product',
    reference_id: 'p-3',
    is_acknowledged: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'alt-3',
    organization_id: 'org-1',
    alert_type: 'ADJUSTMENT_PENDING',
    severity: 'INFO',
    title: 'Stock Adjustment Pending Review',
    message: 'Discrepancy adjustment ADJ-2026-0001 requires Supervisor sign-off.',
    reference_type: 'adjustment',
    reference_id: 'adj-1',
    is_acknowledged: false,
    created_at: new Date(Date.now() - 14400000).toISOString(),
  }
];

export async function fetchAlerts(token: string): Promise<OperationalAlert[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    const stored = localStorage.getItem('finestock_demo_alerts');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // fallback
      }
    }
    return DEMO_ALERTS;
  }

  const res = await fetch(`${API_BASE_URL}/alerts/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch operational alerts');
  const data = await res.json();
  return data.alerts || [];
}

export async function acknowledgeAlert(id: string, token: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    const alerts = await fetchAlerts(token);
    const updated = alerts.map(a => a.id === id ? { ...a, is_acknowledged: true } : a);
    localStorage.setItem('finestock_demo_alerts', JSON.stringify(updated));
    return;
  }

  const res = await fetch(`${API_BASE_URL}/alerts/${id}/ack`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
}
