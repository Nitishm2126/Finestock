'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard } from '@/components/ui/UI';
import { Drawer } from '@/components/ui/Overlay';
import { useToast } from '@/lib/ui/ToastProvider';
import { Boxes, Search, Filter, Download } from 'lucide-react';
import { fetchInventory, StockPosition } from '@/services/inventory.service';

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function InventoryPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [positions, setPositions] = useState<StockPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<StockPosition | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInventory(token!);
      setPositions(data);
    } catch {
      toast.error('Unable to load inventory', 'Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated, loadData]);

  const filtered = positions.filter(p => {
    const matchSearch = !searchQuery || p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || p.warehouse_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || (statusFilter === 'In Stock' && p.available_quantity > 0) || (statusFilter === 'Out of Stock' && p.available_quantity === 0);
    return matchSearch && matchStatus;
  });

  const totalPhysical = positions.reduce((a, p) => a + p.quantity, 0);
  const totalReserved = positions.reduce((a, p) => a + p.reserved_quantity, 0);
  const totalAvailable = positions.reduce((a, p) => a + p.available_quantity, 0);

  const exportCSV = () => {
    const rows = [['Product', 'SKU', 'Warehouse', 'Location', 'Physical', 'Reserved', 'Available', 'Status']];
    filtered.forEach(p => rows.push([p.product_name, p.sku, p.warehouse_name, p.location_name, String(p.quantity), String(p.reserved_quantity), String(p.available_quantity), p.available_quantity > 0 ? 'In Stock' : 'Out of Stock']));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'inventory.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete', 'inventory.csv downloaded.');
  };

  if (authLoading) return null;

  const isD = isDemo;
  void isD;

  return (
    <AppShell title="Inventory">
      <div className="fs-page-inner space-y-6">

        {/* Header */}
        <div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Inventory / Stock</p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inventory</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Real-time stock visibility across your warehouse network.</p>
            </div>
            <button className="fs-btn-secondary" onClick={exportCSV}><Download className="h-4 w-4" /> Export</button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard label="Physical Stock" value={totalPhysical.toLocaleString()} icon={<Boxes className="h-4 w-4" />} />
          <MetricCard label="Reserved" value={totalReserved.toLocaleString()} color="warning" />
          <MetricCard label="Available" value={totalAvailable.toLocaleString()} color="success" />
          <MetricCard label="Low Stock" value={positions.filter(p => p.available_quantity > 0 && p.available_quantity <= 15).length} color="warning" />
          <MetricCard label="Out of Stock" value={positions.filter(p => p.available_quantity === 0).length} color="danger" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search by product, SKU or location…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="fs-input pl-9" />
          </div>
          <div className="flex gap-2">
            {['All', 'In Stock', 'Out of Stock'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="fs-btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  background: statusFilter === s ? 'var(--primary)' : 'var(--surface)',
                  color: statusFilter === s ? '#fff' : 'var(--text-secondary)',
                  borderColor: statusFilter === s ? 'var(--primary)' : 'var(--border)',
                }}
              >
                {s}
              </button>
            ))}
            <button className="fs-btn-secondary"><Filter className="h-4 w-4" /> More Filters</button>
          </div>
        </div>

        {/* Table */}
        <div className="fs-surface overflow-hidden">
          {loading ? (
            <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>Loading inventory…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>No inventory records match your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="fs-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Warehouse / Location</th>
                    <th className="text-right">Physical</th>
                    <th className="text-right">Reserved</th>
                    <th className="text-right">Available</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => (
                    <tr key={idx}>
                      <td>
                        <button className="text-left" onClick={() => { setSelected(p); setDrawerOpen(true); }}>
                          <p className="font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>{p.product_name}</p>
                          <p className="text-xs font-mono" style={{ color: 'var(--primary)' }}>{p.sku}</p>
                        </button>
                      </td>
                      <td>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{p.warehouse_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.location_name}</p>
                      </td>
                      <td className="text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{p.quantity}</td>
                      <td className="text-right" style={{ color: 'var(--warning)' }}>{p.reserved_quantity}</td>
                      <td className="text-right font-semibold" style={{ color: 'var(--success)' }}>{p.available_quantity}</td>
                      <td><StatusBadge status={p.available_quantity > 0 ? 'In Stock' : 'Out of Stock'} size="sm" /></td>
                      <td>
                        <div className="flex gap-1">
                          <button className="fs-btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => { setSelected(p); setDrawerOpen(true); }}>View</button>
                          <button className="fs-btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => router.push('/operations')}>Transfer</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.product_name || ''} subtitle={selected?.sku}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Warehouse', value: selected.warehouse_name },
                { label: 'Location', value: selected.location_name },
                { label: 'Physical Stock', value: selected.quantity },
                { label: 'Reserved', value: selected.reserved_quantity },
                { label: 'Available', value: selected.available_quantity },
                { label: 'Status', value: selected.available_quantity > 0 ? 'In Stock' : 'Out of Stock' },
              ].map(f => (
                <div key={f.label} className="p-3 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{f.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button className="fs-btn-primary flex-1" onClick={() => router.push('/operations')}>Create Transfer</button>
              <button className="fs-btn-secondary flex-1" onClick={() => router.push('/ledger')}>View Ledger</button>
            </div>
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}
