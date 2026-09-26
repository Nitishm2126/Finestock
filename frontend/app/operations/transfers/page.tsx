'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState, SkeletonCard } from '@/components/ui/UI';
import { Modal, Drawer } from '@/components/ui/Overlay';
import { useToast } from '@/lib/ui/ToastProvider';
import {
  ArrowLeftRight, Plus, Search, Filter, CheckCircle, XCircle, Eye,
  Building, MapPin, ArrowRight, ShieldCheck, Play
} from 'lucide-react';
import {
  Transfer,
  fetchTransfers,
  createTransfer,
  approveTransfer,
  executeTransfer,
  cancelTransfer,
} from '@/services/transfer.service';
import { fetchWarehouses, Warehouse } from '@/services/warehouse.service';
import { fetchProducts, Product } from '@/services/product.service';

export default function TransfersPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Drawer
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [form, setForm] = useState({
    source_warehouse_id: '',
    source_location_id: '',
    destination_warehouse_id: '',
    destination_location_id: '',
    reason: 'REBALANCE',
    notes: '',
  });

  const [lines, setLines] = useState<Array<{
    product_id: string;
    quantity: number;
  }>>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [trfs, whs, prods] = await Promise.all([
        fetchTransfers(token || ''),
        fetchWarehouses(token || ''),
        fetchProducts(token || ''),
      ]);
      setTransfers(trfs);
      setWarehouses(whs);
      setProducts(prods);
    } catch {
      toast.error('Failed to load transfers', 'Could not retrieve transfer records.');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  const handleOpenCreate = () => {
    const srcWh = warehouses[0]?.id || '';
    const srcLoc = warehouses[0]?.locations?.[0]?.id || '';
    const dstWh = warehouses[1]?.id || warehouses[0]?.id || '';
    const dstLoc = warehouses[1]?.locations?.[0]?.id || warehouses[0]?.locations?.[1]?.id || srcLoc;
    const prod = products[0]?.id || '';

    setForm({
      source_warehouse_id: srcWh,
      source_location_id: srcLoc,
      destination_warehouse_id: dstWh,
      destination_location_id: dstLoc,
      reason: 'REBALANCE',
      notes: '',
    });

    setLines([{ product_id: prod, quantity: 10 }]);
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.source_location_id || !form.destination_location_id) {
      toast.warning('Invalid Locations', 'Source and destination locations are required.');
      return;
    }
    if (form.source_location_id === form.destination_location_id) {
      toast.warning('Identical Locations', 'Source and destination locations cannot be identical.');
      return;
    }
    if (lines.length === 0 || lines.some(l => !l.product_id || l.quantity <= 0)) {
      toast.warning('Invalid Items', 'Ensure all items have a valid quantity.');
      return;
    }

    setIsProcessing(true);
    try {
      await createTransfer(
        {
          ...form,
          lines: lines.map(l => ({ product_id: l.product_id, quantity: Number(l.quantity) })),
        },
        token || ''
      );
      toast.success('Transfer Requested', 'New internal transfer created in REQUESTED state.');
      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Transfer Error', err.message || 'Unable to create transfer.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (trf: Transfer) => {
    setIsProcessing(true);
    try {
      await approveTransfer(trf.id, token || '');
      toast.success('Transfer Approved', `${trf.transfer_number} approved for execution.`);
      loadData();
    } catch (err: any) {
      toast.error('Approval Error', err.message || 'Could not approve transfer.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecute = async (trf: Transfer) => {
    setIsProcessing(true);
    try {
      await executeTransfer(trf.id, token || '');
      toast.success(
        'Transfer Executed!',
        `Inventory moved atomically. Ledger updated with paired TRANSFER_OUT / TRANSFER_IN entries.`
      );
      setDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Execution Failed', err.message || 'Could not execute atomic transfer.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async (trf: Transfer) => {
    if (!confirm(`Cancel transfer ${trf.transfer_number}?`)) return;
    try {
      await cancelTransfer(trf.id, token || '');
      toast.success('Transfer Cancelled', `${trf.transfer_number} was cancelled.`);
      setDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Cancellation Failed', err.message || 'Could not cancel transfer.');
    }
  };

  const filtered = transfers.filter(t => {
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      t.transfer_number.toLowerCase().includes(q) ||
      (t.source_warehouse?.name && t.source_warehouse.name.toLowerCase().includes(q)) ||
      (t.destination_warehouse?.name && t.destination_warehouse.name.toLowerCase().includes(q)) ||
      (t.reason && t.reason.toLowerCase().includes(q));

    return matchStatus && matchSearch;
  });

  const totalUnitsMoved = transfers
    .filter(t => t.status === 'DONE')
    .reduce((acc, t) => acc + t.lines.reduce((s, l) => s + Number(l.quantity), 0), 0);

  const pendingApprovals = transfers.filter(t => t.status === 'REQUESTED').length;

  return (
    <AppShell title="Internal Transfers">
      <div className="fs-page-inner space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-6 w-6 text-[var(--primary)]" />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Internal Stock Transfers
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Atomically relocate inventory across locations and warehouses. Total network inventory is strictly conserved.
            </p>
          </div>
          <button onClick={handleOpenCreate} className="fs-btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Request Transfer
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Total Transfers"
            value={transfers.length}
            icon={<ArrowLeftRight className="h-5 w-5" />}
          />
          <MetricCard
            label="Pending Approvals"
            value={pendingApprovals}
            color="warning"
            icon={<ShieldCheck className="h-5 w-5 text-amber-500" />}
          />
          <MetricCard
            label="In Transit / Approved"
            value={transfers.filter(t => ['APPROVED', 'IN_TRANSIT'].includes(t.status)).length}
            color="info"
            icon={<Building className="h-5 w-5 text-blue-500" />}
          />
          <MetricCard
            label="Units Rebalanced"
            value={totalUnitsMoved.toLocaleString()}
            color="success"
            icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by transfer #, warehouse, reason..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="fs-input pl-9"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Status:</span>
            <div className="flex rounded-lg p-1 border" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              {['ALL', 'REQUESTED', 'APPROVED', 'IN_TRANSIT', 'DONE', 'CANCELLED'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    statusFilter === tab
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab}
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
              icon={<ArrowLeftRight className="h-10 w-10" />}
              title="No transfers found"
              description={searchQuery ? 'No records matched your search.' : 'No internal stock transfers recorded yet.'}
              action={
                <button onClick={handleOpenCreate} className="fs-btn-primary">
                  <Plus className="h-4 w-4 mr-2 inline" /> Request Transfer
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
                    <th>Transfer #</th>
                    <th>Source (Origin)</th>
                    <th>Destination</th>
                    <th>Items</th>
                    <th>Total Qty</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(trf => {
                    const totalQty = trf.lines.reduce((s, l) => s + Number(l.quantity), 0);

                    return (
                      <tr key={trf.id} className="hover:bg-[var(--surface-muted)] transition-colors">
                        <td className="font-mono text-xs font-bold text-[var(--primary)]">
                          <button
                            onClick={() => { setSelectedTransfer(trf); setDrawerOpen(true); }}
                            className="hover:underline text-left"
                          >
                            {trf.transfer_number}
                          </button>
                          <span className="block text-[10px] text-[var(--text-muted)] font-normal font-sans">
                            {new Date(trf.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="text-xs">
                          <p className="font-semibold text-[var(--text-primary)]">{trf.source_warehouse?.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{trf.source_location?.name || 'Bin Bay'}</p>
                        </td>
                        <td className="text-xs">
                          <p className="font-semibold text-[var(--text-primary)]">{trf.destination_warehouse?.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{trf.destination_location?.name || 'Target Bay'}</p>
                        </td>
                        <td>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
                            {trf.lines.length} SKU{trf.lines.length > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="text-xs font-bold text-[var(--text-primary)]">
                          {totalQty.toLocaleString()} units
                        </td>
                        <td>
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
                            {trf.reason}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={trf.status} size="sm" />
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setSelectedTransfer(trf); setDrawerOpen(true); }}
                              className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {trf.status === 'REQUESTED' && (
                              <button
                                onClick={() => handleApprove(trf)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 flex items-center gap-1"
                                title="Approve Transfer"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Approve
                              </button>
                            )}

                            {['APPROVED', 'IN_TRANSIT'].includes(trf.status) && (
                              <button
                                onClick={() => handleExecute(trf)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center gap-1"
                                title="Execute Atomic Stock Movement"
                              >
                                <Play className="h-3 w-3" /> Execute
                              </button>
                            )}

                            {!['DONE', 'CANCELLED'].includes(trf.status) && (
                              <button
                                onClick={() => handleCancel(trf)}
                                className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10"
                                title="Cancel Transfer"
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

        {/* Create Transfer Modal */}
        <Modal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Request Internal Stock Transfer"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Source */}
              <div className="p-3 rounded-lg border bg-[var(--surface-muted)] space-y-3" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider block">
                  Origin (Source)
                </span>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Source Warehouse *
                  </label>
                  <select
                    required
                    value={form.source_warehouse_id}
                    onChange={e => {
                      const whId = e.target.value;
                      const selWh = warehouses.find(w => w.id === whId);
                      setForm({
                        ...form,
                        source_warehouse_id: whId,
                        source_location_id: selWh?.locations?.[0]?.id || '',
                      });
                    }}
                    className="fs-input text-xs"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Source Location / Bin *
                  </label>
                  <select
                    required
                    value={form.source_location_id}
                    onChange={e => setForm({ ...form, source_location_id: e.target.value })}
                    className="fs-input text-xs"
                  >
                    {warehouses.find(w => w.id === form.source_warehouse_id)?.locations?.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Destination */}
              <div className="p-3 rounded-lg border bg-[var(--surface-muted)] space-y-3" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider block">
                  Target (Destination)
                </span>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Destination Warehouse *
                  </label>
                  <select
                    required
                    value={form.destination_warehouse_id}
                    onChange={e => {
                      const whId = e.target.value;
                      const selWh = warehouses.find(w => w.id === whId);
                      setForm({
                        ...form,
                        destination_warehouse_id: whId,
                        destination_location_id: selWh?.locations?.[0]?.id || '',
                      });
                    }}
                    className="fs-input text-xs"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Destination Location / Bin *
                  </label>
                  <select
                    required
                    value={form.destination_location_id}
                    onChange={e => setForm({ ...form, destination_location_id: e.target.value })}
                    className="fs-input text-xs"
                  >
                    {warehouses.find(w => w.id === form.destination_warehouse_id)?.locations?.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Transfer Reason
                </label>
                <select
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="fs-input"
                >
                  <option value="REBALANCE">Network Rebalance</option>
                  <option value="REPLENISHMENT">Forward Bin Replenishment</option>
                  <option value="DAMAGE_QUARANTINE">Move to Quarantine</option>
                  <option value="RETURNS">Customer Return Inflow</option>
                  <option value="OTHER">Other Internal Move</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Internal Notes
                </label>
                <input
                  type="text"
                  placeholder="Justification or dispatch details"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="fs-input"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-primary)' }}>
                Products to Move
              </span>

              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-[var(--surface-muted)] flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex-1">
                      <select
                        value={line.product_id}
                        onChange={e => {
                          const newLines = [...lines];
                          newLines[idx].product_id = e.target.value;
                          setLines(newLines);
                        }}
                        className="fs-input text-xs"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                    </div>

                    <div className="w-28">
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={e => {
                          const newLines = [...lines];
                          newLines[idx].quantity = parseInt(e.target.value) || 1;
                          setLines(newLines);
                        }}
                        className="fs-input text-xs font-bold text-center"
                      />
                    </div>
                  </div>
                ))}
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
                {isProcessing ? 'Submitting...' : 'Submit Transfer Request'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Detail Drawer */}
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={`Transfer ${selectedTransfer?.transfer_number}`}
        >
          {selectedTransfer && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {selectedTransfer.transfer_number}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">Reason: {selectedTransfer.reason}</p>
                </div>
                <StatusBadge status={selectedTransfer.status} />
              </div>

              <div className="p-3 rounded-lg border bg-[var(--surface-muted)] space-y-2 text-xs" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--primary)]">FROM:</span>
                  <span>{selectedTransfer.source_warehouse?.name} ({selectedTransfer.source_location?.name})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-500">TO:</span>
                  <span>{selectedTransfer.destination_warehouse?.name} ({selectedTransfer.destination_location?.name})</span>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-[var(--text-secondary)]">
                  Transfer Line Items
                </h4>
                <div className="space-y-2">
                  {selectedTransfer.lines.map(line => (
                    <div key={line.id} className="p-3 rounded-lg border bg-[var(--surface-muted)] text-xs flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                      <div>
                        <p className="font-semibold text-sm text-[var(--text-primary)]">{line.product?.name}</p>
                        <p className="text-[10px] font-mono text-[var(--text-muted)]">SKU: {line.product?.sku}</p>
                      </div>
                      <span className="font-bold text-sm text-[var(--primary)]">
                        {line.quantity} units
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
                {selectedTransfer.status === 'REQUESTED' && (
                  <button
                    onClick={() => handleApprove(selectedTransfer)}
                    disabled={isProcessing}
                    className="fs-btn-primary flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" /> Approve Transfer
                  </button>
                )}

                {['APPROVED', 'IN_TRANSIT'].includes(selectedTransfer.status) && (
                  <button
                    onClick={() => handleExecute(selectedTransfer)}
                    disabled={isProcessing}
                    className="fs-btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
                  >
                    <Play className="h-4 w-4" /> Execute Atomic Transfer
                  </button>
                )}

                {!['DONE', 'CANCELLED'].includes(selectedTransfer.status) && (
                  <button
                    onClick={() => handleCancel(selectedTransfer)}
                    className="w-full py-2 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-semibold"
                  >
                    Cancel Transfer
                  </button>
                )}
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AppShell>
  );
}
