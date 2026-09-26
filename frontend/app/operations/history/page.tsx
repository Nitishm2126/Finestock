'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState, SkeletonCard } from '@/components/ui/UI';
import { useToast } from '@/lib/ui/ToastProvider';
import {
  History, Search, Filter, Download, ArrowDownLeft, ArrowUpRight,
  ArrowLeftRight, Sliders, Calendar, User, FileText
} from 'lucide-react';
import {
  MovementEvent,
  fetchMovements,
  MovementFilterParams,
} from '@/services/movement.service';
import { fetchProducts, Product } from '@/services/product.service';
import { fetchWarehouses, Warehouse } from '@/services/warehouse.service';

export default function MovementHistoryPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [movements, setMovements] = useState<MovementEvent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: MovementFilterParams = {};
      if (typeFilter !== 'ALL') filters.event_type = typeFilter;
      if (selectedProduct) filters.product_id = selectedProduct;
      if (searchQuery) filters.search = searchQuery;

      const [movs, prods, whs] = await Promise.all([
        fetchMovements(token || '', filters),
        fetchProducts(token || ''),
        fetchWarehouses(token || ''),
      ]);
      setMovements(movs);
      setProducts(prods);
      setWarehouses(whs);
    } catch {
      toast.error('Failed to load history', 'Unable to retrieve movements from immutable ledger.');
    } finally {
      setLoading(false);
    }
  }, [token, toast, typeFilter, selectedProduct, searchQuery]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  // Export to CSV
  const handleExportCSV = () => {
    if (movements.length === 0) {
      toast.warning('No Data', 'No movements available to export.');
      return;
    }
    const headers = ['Event ID', 'Timestamp', 'Product', 'SKU', 'Event Type', 'Warehouse', 'Location', 'Delta', 'Balance After', 'Actor', 'Reference'];
    const rows = movements.map(m => [
      m.id,
      m.timestamp,
      `"${m.product_name}"`,
      m.sku,
      m.event_type,
      `"${m.warehouse_name}"`,
      `"${m.location_name}"`,
      m.quantity_delta,
      m.balance_after ?? m.quantity_after,
      `"${m.actor_name}"`,
      m.reference_number || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `finestock_movements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export Complete', 'Ledger movements exported to CSV successfully.');
  };

  const filtered = movements.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      m.product_name.toLowerCase().includes(q) ||
      m.sku.toLowerCase().includes(q) ||
      (m.reference_number && m.reference_number.toLowerCase().includes(q)) ||
      m.location_name.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title="Movement History">
      <div className="fs-page-inner space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-6 w-6 text-[var(--primary)]" />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Movement History & Immutable Ledger Audit
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Complete chronological audit trail of all receipts, dispatches, transfers, and cycle count adjustments.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="fs-btn-secondary flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Export Ledger CSV
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Total Audited Events"
            value={movements.length}
            icon={<History className="h-5 w-5" />}
          />
          <MetricCard
            label="Inbound Receipts"
            value={movements.filter(m => m.event_type === 'RECEIPT_IN').length}
            color="success"
            icon={<ArrowDownLeft className="h-5 w-5 text-emerald-500" />}
          />
          <MetricCard
            label="Outbound Dispatches"
            value={movements.filter(m => m.event_type === 'DELIVERY_OUT').length}
            color="info"
            icon={<ArrowUpRight className="h-5 w-5 text-blue-500" />}
          />
          <MetricCard
            label="Internal Transfers"
            value={movements.filter(m => (m.event_type || m.transaction_type || '').startsWith('TRANSFER')).length}
            color="primary"
            icon={<ArrowLeftRight className="h-5 w-5 text-[var(--primary)]" />}
          />
        </div>

        {/* Filters */}
        <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by SKU, item name, reference document..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="fs-input pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                className="fs-input text-xs w-48"
              >
                <option value="">All Products / SKUs</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>

              <div className="flex rounded-lg p-1 border overflow-x-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
                {['ALL', 'RECEIPT_IN', 'DELIVERY_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTypeFilter(tab)}
                    className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-all ${
                      typeFilter === tab
                        ? 'bg-[var(--primary)] text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filtered.length === 0 ? (
          <div className="fs-surface">
            <EmptyState
              icon={<History className="h-10 w-10" />}
              title="No movement events found"
              description="No ledger entries match the selected filters or time window."
            />
          </div>
        ) : (
          <div className="fs-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="fs-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Product & SKU</th>
                    <th>Event Type</th>
                    <th>Warehouse & Location</th>
                    <th>Quantity Delta</th>
                    <th>Balance After</th>
                    <th>Actor</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => {
                    const delta = Number(m.quantity_delta);

                    return (
                      <tr key={m.id} className="hover:bg-[var(--surface-muted)] transition-colors">
                        <td className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                          {new Date(m.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <p className="font-semibold text-sm text-[var(--text-primary)]">{m.product_name}</p>
                          <p className="font-mono text-xs text-[var(--text-muted)]">{m.sku}</p>
                        </td>
                        <td>
                          <StatusBadge status={m.event_type || m.transaction_type || 'TRANSACTION'} size="sm" />
                        </td>
                        <td className="text-xs text-[var(--text-secondary)]">
                          <p className="font-medium text-[var(--text-primary)]">{m.warehouse_name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{m.location_name}</p>
                        </td>
                        <td>
                          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            delta > 0
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        </td>
                        <td>
                          <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                            {Number(m.balance_after ?? m.quantity_after)}
                          </span>
                        </td>
                        <td className="text-xs text-[var(--text-secondary)]">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            {m.actor_name}
                          </div>
                        </td>
                        <td className="text-xs font-mono text-[var(--text-muted)]">
                          {m.reference_number || 'Direct Ledger Event'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
