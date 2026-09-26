'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState, SkeletonCard } from '@/components/ui/UI';
import { Drawer } from '@/components/ui/Overlay';
import { useToast } from '@/lib/ui/ToastProvider';
import {
  Boxes, Search, Filter, Download, ArrowLeftRight, Sliders, History,
  RefreshCw, Radio, Package, Warehouse, MapPin, ExternalLink
} from 'lucide-react';
import { fetchInventory, StockPosition, InventoryFilterParams } from '@/services/inventory.service';
import { fetchWarehouses, Warehouse as WHType } from '@/services/warehouse.service';
import { RealtimeClient, RealtimeStatus } from '@/services/realtime.service';

export default function InventoryPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [positions, setPositions] = useState<StockPosition[]>([]);
  const [warehouses, setWarehouses] = useState<WHType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Real-time status
  const [wsStatus, setWsStatus] = useState<RealtimeStatus>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Detail Drawer
  const [selected, setSelected] = useState<StockPosition | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  // Ticking timer for "Updated Xs ago"
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      setSecondsAgo(diff);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const loadData = useCallback(async () => {
    try {
      const filters: InventoryFilterParams = {};
      if (searchQuery) filters.search = searchQuery;
      if (warehouseFilter) filters.warehouse_id = warehouseFilter;
      if (statusFilter === 'LOW_STOCK') filters.low_stock = true;
      if (statusFilter === 'OUT_OF_STOCK') filters.out_of_stock = true;

      const [data, whs] = await Promise.all([
        fetchInventory(token || '', filters),
        fetchWarehouses(token || ''),
      ]);
      setPositions(data);
      setWarehouses(whs);
      setLastUpdated(new Date());
    } catch {
      toast.error('Unable to load inventory', 'Could not retrieve stock balance records.');
    } finally {
      setLoading(false);
    }
  }, [token, toast, searchQuery, warehouseFilter, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();

      // Connect to Real-time WebSocket
      const client = new RealtimeClient(token || '');
      const unbindStatus = client.onStatusChange(status => {
        setWsStatus(status);
      });
      const unbindEvent = client.onEvent(event => {
        // Automatic live update when stock event arrives
        loadData();
      });
      client.connect();

      return () => {
        unbindStatus();
        unbindEvent();
        client.disconnect();
      };
    }
  }, [isAuthenticated, token, loadData]);

  // Aggregated KPI counts
  const totalPhysical = positions.reduce((a, p) => a + Number(p.quantity), 0);
  const totalReserved = positions.reduce((a, p) => a + Number(p.reserved_quantity), 0);
  const totalAvailable = positions.reduce((a, p) => a + Number(p.available_quantity), 0);
  const totalIncoming = positions.reduce((a, p) => a + Number(p.incoming_quantity || 0), 0);
  const totalOutgoing = positions.reduce((a, p) => a + Number(p.outgoing_quantity || 0), 0);
  const lowStockCount = positions.filter(p => p.risk === 'Low Stock' || p.risk === 'Critical').length;
  const outOfStockCount = positions.filter(p => p.available_quantity <= 0).length;

  const exportCSV = () => {
    const rows = [['Product', 'SKU', 'Warehouse', 'Location', 'Physical', 'Reserved', 'Available', 'Incoming', 'Outgoing', 'Risk']];
    positions.forEach(p =>
      rows.push([
        `"${p.product_name}"`,
        p.sku,
        `"${p.warehouse_name}"`,
        `"${p.location_name}"`,
        String(p.quantity),
        String(p.reserved_quantity),
        String(p.available_quantity),
        String(p.incoming_quantity || 0),
        String(p.outgoing_quantity || 0),
        p.risk || 'Healthy',
      ])
    );
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finestock_realtime_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete', 'Live inventory exported to CSV.');
  };

  const getStatusBadge = () => {
    switch (wsStatus) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE &bull; Updated {secondsAgo}s ago
          </span>
        );
      case 'reconnecting':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-spin" /> RECONNECTING...
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> OFFLINE SYNC
          </span>
        );
    }
  };

  return (
    <AppShell title="Real-Time Inventory Control">
      <div className="fs-page-inner space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="h-6 w-6 text-[var(--primary)]" />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Real-Time Inventory Control Center
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Location-level balances, reservation allocations, incoming/outgoing flow, and immutable ledger traceability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <button
              onClick={() => { setLoading(true); loadData(); }}
              className="fs-btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
              title="Force Sync"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button className="fs-btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>

        {/* Real-time KPI Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <MetricCard label="On Hand (Physical)" value={totalPhysical.toLocaleString()} icon={<Boxes className="h-4 w-4" />} />
          <MetricCard label="Reserved Stock" value={totalReserved.toLocaleString()} color="warning" />
          <MetricCard label="Available Stock" value={totalAvailable.toLocaleString()} color="success" />
          <MetricCard label="Incoming Inflow" value={totalIncoming.toLocaleString()} color="info" />
          <MetricCard label="Outgoing Committed" value={totalOutgoing.toLocaleString()} color="primary" />
          <MetricCard label="Low / Zero Stock" value={lowStockCount} color={lowStockCount > 0 ? 'danger' : 'default'} />
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search product, SKU, bin location..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="fs-input pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={warehouseFilter}
              onChange={e => setWarehouseFilter(e.target.value)}
              className="fs-input text-xs w-44"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <div className="flex rounded-lg p-1 border overflow-x-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              {['ALL', 'HEALTHY', 'LOW_STOCK', 'OUT_OF_STOCK'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === tab
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab === 'ALL' ? 'All Stock' : tab.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="fs-surface overflow-hidden">
          {loading ? (
            <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[var(--primary)]" />
              Loading real-time positions...
            </div>
          ) : positions.length === 0 ? (
            <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>
              No inventory positions match your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="fs-table">
                <thead>
                  <tr>
                    <th>Product & SKU</th>
                    <th>Warehouse & Location</th>
                    <th className="text-right">On Hand</th>
                    <th className="text-right">Reserved</th>
                    <th className="text-right">Available</th>
                    <th className="text-right">Incoming</th>
                    <th className="text-right">Outgoing</th>
                    <th>Risk State</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p, idx) => (
                    <tr key={`${p.product_id}-${p.location_id}-${idx}`} className="hover:bg-[var(--surface-muted)] transition-colors">
                      <td>
                        <button
                          className="text-left group"
                          onClick={() => { setSelected(p); setDrawerOpen(true); }}
                        >
                          <p className="font-semibold text-sm group-hover:underline text-[var(--text-primary)]">
                            {p.product_name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-[var(--primary)]">{p.sku}</span>
                            {p.category_name && (
                              <span className="text-[10px] text-[var(--text-muted)]">&bull; {p.category_name}</span>
                            )}
                          </div>
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] font-medium">
                          <Warehouse className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          {p.warehouse_name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {p.location_name}
                        </div>
                      </td>
                      <td className="text-right font-mono font-bold text-sm text-[var(--text-primary)]">
                        {Number(p.quantity).toLocaleString()}
                      </td>
                      <td className="text-right font-mono text-xs font-semibold text-amber-500">
                        {Number(p.reserved_quantity).toLocaleString()}
                      </td>
                      <td className="text-right font-mono font-bold text-sm text-emerald-500">
                        {Number(p.available_quantity).toLocaleString()}
                      </td>
                      <td className="text-right font-mono text-xs text-blue-400">
                        +{Number(p.incoming_quantity || 0).toLocaleString()}
                      </td>
                      <td className="text-right font-mono text-xs text-purple-400">
                        -{Number(p.outgoing_quantity || 0).toLocaleString()}
                      </td>
                      <td>
                        <StatusBadge status={p.risk || 'Healthy'} size="sm" />
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="fs-btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                            onClick={() => router.push(`/inventory/${p.product_id}`)}
                            title="Inspect Immutable Ledger Timeline"
                          >
                            <History className="h-3.5 w-3.5" /> Timeline
                          </button>
                          <button
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                            onClick={() => router.push('/operations/transfers')}
                            title="Move / Transfer SKU"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                            onClick={() => router.push('/operations/adjustments')}
                            title="Propose Stock Adjustment"
                          >
                            <Sliders className="h-3.5 w-3.5" />
                          </button>
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
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selected?.product_name || 'Stock Position'}
        subtitle={`SKU: ${selected?.sku}`}
      >
        {selected && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border bg-[var(--surface-muted)] space-y-2 text-xs" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Warehouse:</span>
                <span className="font-semibold text-[var(--text-primary)]">{selected.warehouse_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Location Bin:</span>
                <span className="font-semibold text-[var(--text-primary)]">{selected.location_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Operational Risk:</span>
                <StatusBadge status={selected.risk || 'Healthy'} size="sm" />
              </div>
            </div>

            {/* Balances Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border bg-[var(--surface-muted)]" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Physical On Hand</p>
                <p className="text-xl font-bold text-[var(--text-primary)] font-mono">{Number(selected.quantity)}</p>
              </div>
              <div className="p-3 rounded-xl border bg-[var(--surface-muted)]" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Reserved Allocation</p>
                <p className="text-xl font-bold text-amber-500 font-mono">{Number(selected.reserved_quantity)}</p>
              </div>
              <div className="p-3 rounded-xl border bg-[var(--surface-muted)]" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Net Available</p>
                <p className="text-xl font-bold text-emerald-500 font-mono">{Number(selected.available_quantity)}</p>
              </div>
              <div className="p-3 rounded-xl border bg-[var(--surface-muted)]" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Pipeline Inbound</p>
                <p className="text-xl font-bold text-blue-400 font-mono">+{Number(selected.incoming_quantity || 0)}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-[var(--surface-muted)] text-xs text-[var(--text-secondary)]" style={{ borderColor: 'var(--border)' }}>
              <p className="font-semibold mb-1 text-[var(--text-primary)]">Inventory Formula</p>
              <p className="font-mono text-[11px]">AVAILABLE = PHYSICAL ({Number(selected.quantity)}) - RESERVED ({Number(selected.reserved_quantity)}) = {Number(selected.available_quantity)}</p>
            </div>

            {/* Deep navigation actions */}
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                className="fs-btn-primary w-full flex items-center justify-center gap-2"
                onClick={() => router.push(`/inventory/${selected.product_id}`)}
              >
                <History className="h-4 w-4" /> Open Product Audit Timeline
              </button>
              <div className="flex gap-2">
                <button
                  className="fs-btn-secondary flex-1"
                  onClick={() => router.push('/operations/transfers')}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-1 inline" /> Transfer
                </button>
                <button
                  className="fs-btn-secondary flex-1"
                  onClick={() => router.push('/operations/adjustments')}
                >
                  <Sliders className="h-4 w-4 mr-1 inline" /> Adjust
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}
