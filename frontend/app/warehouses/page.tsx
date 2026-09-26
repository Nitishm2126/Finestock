'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState } from '@/components/ui/UI';
import { Drawer, Modal } from '@/components/ui/Overlay';
import { useToast } from '@/lib/ui/ToastProvider';
import { Building2, Plus, Search, Map } from 'lucide-react';
import { demoGetWarehouses, demoCreateWarehouse, demoDeactivateWarehouse } from '@/lib/demo/store';
import { fetchWarehouses } from '@/services/warehouse.service';

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Warehouse = any;

export default function WarehousesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', city: '' });
  const [drawerTab, setDrawerTab] = useState<'overview' | 'inventory'>('overview');

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemo) {
        setWarehouses(demoGetWarehouses());
      } else {
        const data = await fetchWarehouses(token!);
        setWarehouses(data);
      }
    } catch {
      toast.error('Unable to load warehouses', 'Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { if (isAuthenticated) loadWarehouses(); }, [isAuthenticated, loadWarehouses]);

  const filtered = warehouses.filter(w =>
    !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (!form.name || !form.code || !form.city) { toast.warning('All fields are required'); return; }
    if (isDemo) {
      demoCreateWarehouse({ ...form });
      toast.success('Warehouse created', `${form.name} added to the network.`);
      setCreateOpen(false);
      setForm({ name: '', code: '', city: '' });
      loadWarehouses();
    }
  };

  const handleDeactivate = (w: Warehouse) => {
    if (isDemo) {
      demoDeactivateWarehouse(w.id);
      toast.success('Warehouse deactivated', `${w.name} has been deactivated.`);
      if (drawerOpen) setDrawerOpen(false);
      loadWarehouses();
    }
  };

  if (authLoading) return null;

  const totalLocations = warehouses.reduce((a, w) => a + w.locations_count, 0);
  const totalUnits = warehouses.reduce((a, w) => a + (w.stock_units ?? 0), 0);
  const avgUtil = warehouses.length ? Math.round(warehouses.reduce((a, w) => a + (w.utilization ?? 0), 0) / warehouses.length) : 0;

  return (
    <AppShell title="Warehouses">
      <div className="fs-page-inner space-y-6">

        {/* Header */}
        <div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Inventory / Warehouses</p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Warehouse Network</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Monitor locations, capacity and inventory distribution.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="fs-btn-secondary"><Map className="h-4 w-4" /> Network Map</button>
              <button className="fs-btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add Warehouse</button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Warehouses" value={warehouses.length} subValue="In network" icon={<Building2 className="h-4 w-4" />} />
          <MetricCard label="Total Locations" value={totalLocations} subValue="Active storage zones" color="primary" />
          <MetricCard label="Total Stock Units" value={totalUnits.toLocaleString()} subValue="Tracked physical units" />
          <MetricCard label="Avg. Utilization" value={`${avgUtil}%`} subValue="Network-wide capacity" color={avgUtil > 70 ? 'warning' : 'success'} />
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search warehouses…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="fs-input pl-9" />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>Loading warehouses…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Building2 className="h-10 w-10" />} title="No warehouses found" description="Add your first warehouse to get started." action={<button className="fs-btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add Warehouse</button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(w => (
              <div
                key={w.id}
                className="fs-surface p-5 cursor-pointer transition-all hover:shadow-[var(--shadow-md)]"
                onClick={() => { setSelectedWarehouse(w); setDrawerOpen(true); setDrawerTab('overview'); }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'var(--primary-soft)' }}>
                    <Building2 className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                  </div>
                  <StatusBadge status={w.is_active ? 'Active' : 'Inactive'} size="sm" />
                </div>
                <h3 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>{w.name}</h3>
                <p className="text-xs font-mono mb-4" style={{ color: 'var(--primary)' }}>{w.code}</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>{w.city}</p>
                <div className="space-y-2 text-xs border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Locations</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{w.locations_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Stock Units</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{(w.stock_units ?? 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span style={{ color: 'var(--text-secondary)' }}>Utilization</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{w.utilization ?? 0}%</span>
                    </div>
                    <div className="fs-progress-bg h-1.5">
                      <div className="fs-progress-fill" style={{ width: `${w.utilization ?? 0}%`, background: (w.utilization ?? 0) > 70 ? 'var(--warning)' : 'var(--success)', height: '100%' }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warehouse Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selectedWarehouse?.name || ''} subtitle={selectedWarehouse ? `${selectedWarehouse.code} · ${selectedWarehouse.city}` : ''} width={540}>
        {selectedWarehouse && (
          <div className="space-y-5">
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-muted)' }}>
              {(['overview', 'inventory'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className="flex-1 py-1.5 px-3 rounded-md text-sm font-medium capitalize transition-colors"
                  style={{
                    background: drawerTab === tab ? 'var(--surface)' : 'transparent',
                    color: drawerTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: drawerTab === tab ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {drawerTab === 'overview' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Code', value: selectedWarehouse.code },
                    { label: 'City', value: selectedWarehouse.city },
                    { label: 'Status', value: selectedWarehouse.is_active ? 'Active' : 'Inactive' },
                    { label: 'Locations', value: selectedWarehouse.locations_count },
                    { label: 'Stock Units', value: (selectedWarehouse.stock_units ?? 0).toLocaleString() },
                    { label: 'Utilization', value: `${selectedWarehouse.utilization ?? 0}%` },
                    { label: 'Health Status', value: selectedWarehouse.status || 'N/A' },
                  ].map(f => (
                    <div key={f.label} className="p-3 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{f.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button className="fs-btn-primary flex-1" onClick={() => router.push('/operations')}>Add Operation</button>
                  {selectedWarehouse.is_active && (
                    <button className="fs-btn-secondary flex-1" onClick={() => handleDeactivate(selectedWarehouse)}>Deactivate</button>
                  )}
                </div>
              </>
            )}

            {drawerTab === 'inventory' && (
              <div className="text-center py-10 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
                <Building2 className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Inventory breakdown</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>View full inventory in the Inventory module.</p>
                <button className="fs-btn-primary mt-4" onClick={() => router.push('/inventory')}>Go to Inventory</button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Warehouse" subtitle="Create a new warehouse in your network">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Warehouse Name *</label>
            <input className="fs-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mumbai Warehouse" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Warehouse Code *</label>
            <input className="fs-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. MUM-01" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>City *</label>
            <input className="fs-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Mumbai" />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="fs-btn-secondary flex-1" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="fs-btn-primary flex-1" onClick={handleCreate} disabled={!form.name || !form.code || !form.city}>Add Warehouse</button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
