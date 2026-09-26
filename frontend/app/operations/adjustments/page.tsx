'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState, SkeletonCard } from '@/components/ui/UI';
import { Modal, Drawer } from '@/components/ui/Overlay';
import { useToast } from '@/lib/ui/ToastProvider';
import {
  Sliders, Plus, Search, Filter, CheckCircle, XCircle, Eye,
  AlertTriangle, ShieldAlert, ArrowRight, Package, Warehouse, MapPin
} from 'lucide-react';
import {
  StockAdjustment,
  fetchAdjustments,
  createAdjustment,
  approveAdjustment,
  cancelAdjustment,
} from '@/services/adjustment.service';
import { fetchWarehouses, Warehouse as WHType } from '@/services/warehouse.service';
import { fetchProducts, Product } from '@/services/product.service';
import { fetchInventory, StockPosition } from '@/services/inventory.service';

export default function AdjustmentsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [warehouses, setWarehouses] = useState<WHType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<StockPosition[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Drawer
  const [selectedAdj, setSelectedAdj] = useState<StockAdjustment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [form, setForm] = useState({
    product_id: '',
    warehouse_id: '',
    location_id: '',
    physical_count: 0,
    reason: 'COUNT_CORRECTION',
    notes: '',
  });

  const [detectedSystemQty, setDetectedSystemQty] = useState<number>(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [adjs, whs, prods, inv] = await Promise.all([
        fetchAdjustments(token || ''),
        fetchWarehouses(token || ''),
        fetchProducts(token || ''),
        fetchInventory(token || ''),
      ]);
      setAdjustments(adjs);
      setWarehouses(whs);
      setProducts(prods);
      setInventory(inv);
    } catch {
      toast.error('Failed to load adjustments', 'Could not retrieve inventory adjustments.');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  const handleOpenCreate = () => {
    const prod = products[0]?.id || '';
    const wh = warehouses[0]?.id || '';
    const loc = warehouses[0]?.locations?.[0]?.id || '';

    // Check system quantity for this combination
    const pos = inventory.find(i => i.product_id === prod && i.location_id === loc);
    const sys = pos ? Number(pos.quantity) : 0;
    setDetectedSystemQty(sys);

    setForm({
      product_id: prod,
      warehouse_id: wh,
      location_id: loc,
      physical_count: sys,
      reason: 'COUNT_CORRECTION',
      notes: '',
    });
    setCreateModalOpen(true);
  };

  const updateDetectedQty = (prodId: string, locId: string) => {
    const pos = inventory.find(i => i.product_id === prodId && i.location_id === locId);
    const sys = pos ? Number(pos.quantity) : 0;
    setDetectedSystemQty(sys);
    setForm(prev => ({ ...prev, physical_count: sys }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id || !form.warehouse_id || !form.location_id) {
      toast.warning('Incomplete Form', 'Product, Warehouse, and Location are required.');
      return;
    }

    setIsProcessing(true);
    try {
      await createAdjustment(
        {
          ...form,
          physical_count: Number(form.physical_count),
        },
        token || ''
      );
      toast.success(
        'Adjustment Proposed',
        'Stock adjustment registered in PENDING_APPROVAL state for supervisor review.'
      );
      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Submission Failed', err.message || 'Error recording adjustment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (adj: StockAdjustment) => {
    setIsProcessing(true);
    try {
      await approveAdjustment(adj.id, token || '');
      toast.success(
        'Adjustment Approved',
        `${adj.adjustment_number} reconciled. Signed variance committed to ledger.`
      );
      setDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Approval Failed', err.message || 'Could not approve adjustment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async (adj: StockAdjustment) => {
    if (!confirm(`Cancel adjustment ${adj.adjustment_number}?`)) return;
    try {
      await cancelAdjustment(adj.id, token || '');
      toast.success('Adjustment Cancelled', `${adj.adjustment_number} has been cancelled.`);
      setDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Cancellation Failed', err.message || 'Could not cancel adjustment.');
    }
  };

  const filtered = adjustments.filter(a => {
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      a.adjustment_number.toLowerCase().includes(q) ||
      ((a.product?.name || a.product_name || a.sku || '').toLowerCase().includes(q)) ||
      (a.reason && a.reason.toLowerCase().includes(q));

    return matchStatus && matchSearch;
  });

  const pendingCount = adjustments.filter(a => a.status === 'PENDING_APPROVAL').length;
  const approvedCount = adjustments.filter(a => a.status === 'APPROVED').length;
  const totalVariance = adjustments
    .filter(a => a.status === 'APPROVED')
    .reduce((acc, a) => acc + Number(a.difference), 0);

  return (
    <AppShell title="Stock Adjustments">
      <div className="fs-page-inner space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="h-6 w-6 text-[var(--primary)]" />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Physical Stock Adjustments (Cycle Count Audit)
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Reconcile physical inventory discrepancies with dual-custody approval, variance ledger audit, and reason codes.
            </p>
          </div>
          <button onClick={handleOpenCreate} className="fs-btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Propose Adjustment
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Total Audits"
            value={adjustments.length}
            icon={<Sliders className="h-5 w-5" />}
          />
          <MetricCard
            label="Pending Review"
            value={pendingCount}
            color="warning"
            icon={<ShieldAlert className="h-5 w-5 text-amber-500" />}
          />
          <MetricCard
            label="Approved Reconciliations"
            value={approvedCount}
            color="success"
            icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
          />
          <MetricCard
            label="Net Variance (Units)"
            value={`${totalVariance >= 0 ? '+' : ''}${totalVariance}`}
            color={totalVariance < 0 ? 'danger' : 'info'}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by adjustment #, product, reason..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="fs-input pl-9"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Status:</span>
            <div className="flex rounded-lg p-1 border" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    statusFilter === tab
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
              icon={<Sliders className="h-10 w-10" />}
              title="No adjustments found"
              description={searchQuery ? 'No records match your filters.' : 'No discrepancies or cycle counts submitted yet.'}
              action={
                <button onClick={handleOpenCreate} className="fs-btn-primary">
                  <Plus className="h-4 w-4 mr-2 inline" /> Propose Adjustment
                </button>
              }
            />
          </div>
        ) : (
          <div className="fs-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="fs-table">
                <thead>
                  <tr>
                    <th>Adjustment #</th>
                    <th>Product</th>
                    <th>Location</th>
                    <th>System Qty</th>
                    <th>Physical Count</th>
                    <th>Difference</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(adj => {
                    const diff = Number(adj.difference);

                    return (
                      <tr key={adj.id} className="hover:bg-[var(--surface-muted)] transition-colors">
                        <td className="font-mono text-xs font-bold text-[var(--primary)]">
                          <button
                            onClick={() => { setSelectedAdj(adj); setDrawerOpen(true); }}
                            className="hover:underline text-left"
                          >
                            {adj.adjustment_number}
                          </button>
                          <span className="block text-[10px] text-[var(--text-muted)] font-normal font-sans">
                            {new Date(adj.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="text-sm font-semibold text-[var(--text-primary)]">
                          {adj.product?.name || adj.product_name || 'Stock Item'}
                          <span className="block text-[10px] font-mono text-[var(--text-muted)]">
                            {adj.product?.sku || adj.sku || 'N/A'}
                          </span>
                        </td>
                        <td className="text-xs text-[var(--text-secondary)]">
                          {adj.warehouse?.name || adj.warehouse_name || 'Main WH'} / {adj.location?.name || adj.location_name || 'Default Bay'}
                        </td>
                        <td className="text-xs font-medium">{Number(adj.system_quantity)}</td>
                        <td className="text-xs font-bold">{Number(adj.physical_count)}</td>
                        <td>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            diff > 0
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : diff < 0
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                              : 'bg-slate-500/10 text-slate-400'
                          }`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </td>
                        <td>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
                            {adj.reason}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={adj.status} size="sm" />
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setSelectedAdj(adj); setDrawerOpen(true); }}
                              className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {adj.status === 'PENDING_APPROVAL' && (
                              <button
                                onClick={() => handleApprove(adj)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center gap-1"
                                title="Approve Adjustment & Update Stock"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Approve
                              </button>
                            )}

                            {adj.status === 'PENDING_APPROVAL' && (
                              <button
                                onClick={() => handleCancel(adj)}
                                className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10"
                                title="Reject / Cancel"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Modal */}
        <Modal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Propose Physical Stock Adjustment"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Product SKU *
              </label>
              <select
                required
                value={form.product_id}
                onChange={e => {
                  const pid = e.target.value;
                  setForm({ ...form, product_id: pid });
                  updateDetectedQty(pid, form.location_id);
                }}
                className="fs-input"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Warehouse *
                </label>
                <select
                  required
                  value={form.warehouse_id}
                  onChange={e => {
                    const wid = e.target.value;
                    const selWh = warehouses.find(w => w.id === wid);
                    const defLoc = selWh?.locations?.[0]?.id || '';
                    setForm({ ...form, warehouse_id: wid, location_id: defLoc });
                    updateDetectedQty(form.product_id, defLoc);
                  }}
                  className="fs-input text-xs"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Location Bin *
                </label>
                <select
                  required
                  value={form.location_id}
                  onChange={e => {
                    const lid = e.target.value;
                    setForm({ ...form, location_id: lid });
                    updateDetectedQty(form.product_id, lid);
                  }}
                  className="fs-input text-xs"
                >
                  {warehouses.find(w => w.id === form.warehouse_id)?.locations?.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Counts Comparison Box */}
            <div className="p-4 rounded-xl border bg-[var(--surface-muted)] grid grid-cols-3 gap-4 text-center" style={{ borderColor: 'var(--border)' }}>
              <div>
                <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block mb-1">
                  System Recorded
                </span>
                <span className="text-lg font-bold text-[var(--text-primary)]">
                  {detectedSystemQty}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block mb-1">
                  Physical Count *
                </span>
                <input
                  type="number"
                  required
                  min="0"
                  value={form.physical_count}
                  onChange={e => setForm({ ...form, physical_count: parseInt(e.target.value) || 0 })}
                  className="fs-input text-center font-bold text-lg text-[var(--primary)]"
                />
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block mb-1">
                  Variance Difference
                </span>
                <span className={`text-lg font-bold ${
                  form.physical_count - detectedSystemQty > 0
                    ? 'text-emerald-500'
                    : form.physical_count - detectedSystemQty < 0
                    ? 'text-red-500'
                    : 'text-[var(--text-muted)]'
                }`}>
                  {form.physical_count - detectedSystemQty > 0 ? `+${form.physical_count - detectedSystemQty}` : form.physical_count - detectedSystemQty}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Adjustment Reason
                </label>
                <select
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="fs-input"
                >
                  <option value="COUNT_CORRECTION">Cycle Count Correction</option>
                  <option value="DAMAGE">Damaged Goods</option>
                  <option value="SHRINKAGE">Shrinkage / Unaccounted Loss</option>
                  <option value="FOUND_STOCK">Found Stock in Bin</option>
                  <option value="DATA_ERROR">System Data Entry Error</option>
                  <option value="EXPIRY">Expired / Degraded</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Audit Notes / Remarks
                </label>
                <input
                  type="text"
                  placeholder="Explain justification for audit"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="fs-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="fs-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="fs-btn-primary"
              >
                {isProcessing ? 'Submitting...' : 'Submit for Supervisor Approval'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Detail Drawer */}
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={`Adjustment ${selectedAdj?.adjustment_number}`}
        >
          {selectedAdj && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {selectedAdj.adjustment_number}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">Reason: {selectedAdj.reason}</p>
                </div>
                <StatusBadge status={selectedAdj.status} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[var(--text-muted)]">Product:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedAdj.product?.name || selectedAdj.product_name || selectedAdj.sku}</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[var(--text-muted)]">Warehouse:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedAdj.warehouse?.name || selectedAdj.warehouse_name || 'Main Warehouse'}</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[var(--text-muted)]">Location:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedAdj.location?.name || selectedAdj.location_name || 'Default Bay'}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border bg-[var(--surface-muted)] grid grid-cols-3 gap-2 text-center" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-[10px] uppercase text-[var(--text-muted)]">System</p>
                  <p className="text-base font-bold text-[var(--text-primary)]">{Number(selectedAdj.system_quantity)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-[var(--text-muted)]">Physical</p>
                  <p className="text-base font-bold text-[var(--primary)]">{Number(selectedAdj.physical_count)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-[var(--text-muted)]">Variance</p>
                  <p className={`text-base font-bold ${
                    Number(selectedAdj.difference) > 0 ? 'text-emerald-500' : Number(selectedAdj.difference) < 0 ? 'text-red-500' : ''
                  }`}>
                    {Number(selectedAdj.difference) > 0 ? `+${selectedAdj.difference}` : selectedAdj.difference}
                  </p>
                </div>
              </div>

              {selectedAdj.notes && (
                <div className="p-3 rounded-lg bg-[var(--surface-muted)] border" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Auditor Notes</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedAdj.notes}</p>
                </div>
              )}

              {/* Actions */}
              {selectedAdj.status === 'PENDING_APPROVAL' && (
                <div className="pt-4 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => handleApprove(selectedAdj)}
                    disabled={isProcessing}
                    className="fs-btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2 inline" /> Approve Reconciliation
                  </button>
                  <button
                    onClick={() => handleCancel(selectedAdj)}
                    className="p-2 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-semibold"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </AppShell>
  );
}
