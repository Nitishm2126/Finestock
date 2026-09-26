'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState, SkeletonCard } from '@/components/ui/UI';
import { Modal, Drawer } from '@/components/ui/Overlay';
import { useToast } from '@/lib/ui/ToastProvider';
import {
  ArrowDownToLine, Plus, Search, Filter, CheckCircle, XCircle, Eye,
  Building, MapPin, Calendar, FileText, Package, ArrowRight
} from 'lucide-react';
import {
  Receipt,
  fetchReceipts,
  createReceipt,
  validateReceipt,
  cancelReceipt,
} from '@/services/receipt.service';
import { fetchSuppliers, Supplier } from '@/services/supplier.service';
import { fetchWarehouses, Warehouse } from '@/services/warehouse.service';
import { fetchProducts, Product } from '@/services/product.service';

export default function ReceiptsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Drawer
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Validation Modal
  const [validateModalOpen, setValidateModalOpen] = useState(false);
  const [validationLines, setValidationLines] = useState<{ id: string; received: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    supplier_id: '',
    warehouse_id: '',
    expected_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    reference_number: '',
    notes: '',
  });

  const [lines, setLines] = useState<Array<{
    product_id: string;
    expected_quantity: number;
    destination_location_id: string;
  }>>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, sups, whs, prods] = await Promise.all([
        fetchReceipts(token || ''),
        fetchSuppliers(token || ''),
        fetchWarehouses(token || ''),
        fetchProducts(token || ''),
      ]);
      setReceipts(recs);
      setSuppliers(sups);
      setWarehouses(whs);
      setProducts(prods);
    } catch {
      toast.error('Failed to load receipts', 'Unable to fetch data from the server.');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  // Handle open create modal
  const handleOpenCreate = () => {
    const defaultWh = warehouses[0]?.id || '';
    const defaultSup = suppliers[0]?.id || '';
    const defaultLoc = warehouses[0]?.locations?.[0]?.id || '';
    const defaultProd = products[0]?.id || '';

    setForm({
      supplier_id: defaultSup,
      warehouse_id: defaultWh,
      expected_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      reference_number: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: '',
    });

    setLines([
      {
        product_id: defaultProd,
        expected_quantity: 50,
        destination_location_id: defaultLoc,
      },
    ]);
    setCreateModalOpen(true);
  };

  const handleAddLine = () => {
    const defaultProd = products[0]?.id || '';
    const selWh = warehouses.find(w => w.id === form.warehouse_id);
    const defaultLoc = selWh?.locations?.[0]?.id || '';
    setLines([...lines, { product_id: defaultProd, expected_quantity: 10, destination_location_id: defaultLoc }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier_id || !form.warehouse_id) {
      toast.warning('Incomplete Form', 'Supplier and Warehouse must be selected.');
      return;
    }
    if (lines.length === 0 || lines.some(l => !l.product_id || l.expected_quantity <= 0)) {
      toast.warning('Invalid Lines', 'Ensure all items have a product and expected quantity > 0.');
      return;
    }

    setIsProcessing(true);
    try {
      await createReceipt(
        {
          ...form,
          lines: lines.map(l => ({
            ...l,
            expected_quantity: Number(l.expected_quantity),
          })),
        },
        token || ''
      );
      toast.success('Receipt Created', 'New inbound receipt registered in DRAFT state.');
      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Creation Failed', err.message || 'Failed to create receipt.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open validate modal
  const handleOpenValidate = (rec: Receipt) => {
    setSelectedReceipt(rec);
    setValidationLines(
      rec.lines.map(l => ({
        id: l.id,
        received: l.expected_quantity - l.received_quantity,
      }))
    );
    setValidateModalOpen(true);
  };

  const handleExecuteValidate = async () => {
    if (!selectedReceipt) return;
    setIsProcessing(true);
    try {
      const lineMap: Record<string, number> = {};
      validationLines.forEach(l => {
        lineMap[l.id] = Number(l.received);
      });

      await validateReceipt(selectedReceipt.id, lineMap, token || '');
      toast.success(
        'Receipt Validated!',
        `${selectedReceipt.receipt_number} validated. Stock updated & immutable ledger entry written.`
      );
      setValidateModalOpen(false);
      setDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Validation Failed', err.message || 'Could not validate receipt.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async (rec: Receipt) => {
    if (!confirm(`Are you sure you want to cancel receipt ${rec.receipt_number}?`)) return;
    try {
      await cancelReceipt(rec.id, token || '');
      toast.success('Receipt Cancelled', `${rec.receipt_number} has been cancelled.`);
      loadData();
    } catch (err: any) {
      toast.error('Cancellation Failed', err.message || 'Unable to cancel receipt.');
    }
  };

  // Filtered list
  const filtered = receipts.filter(r => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      r.receipt_number.toLowerCase().includes(q) ||
      (r.supplier?.name && r.supplier.name.toLowerCase().includes(q)) ||
      (r.reference_number && r.reference_number.toLowerCase().includes(q));

    return matchStatus && matchSearch;
  });

  const totalExpectedUnits = receipts.reduce(
    (acc, r) => acc + r.lines.reduce((lAcc, l) => lAcc + Number(l.expected_quantity), 0),
    0
  );
  const totalReceivedUnits = receipts.reduce(
    (acc, r) => acc + r.lines.reduce((lAcc, l) => lAcc + Number(l.received_quantity), 0),
    0
  );
  const pendingReceiptsCount = receipts.filter(r => r.status === 'WAITING' || r.status === 'PARTIAL').length;

  return (
    <AppShell title="Inbound Receipts">
      <div className="fs-page-inner space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="h-6 w-6 text-[var(--primary)]" />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Inbound Receipts (PO / Vendor Inflow)
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Stock increases only upon physical receipt validation. Every validation commits an immutable ledger event.
            </p>
          </div>
          <button onClick={handleOpenCreate} className="fs-btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Receipt
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Total Receipts"
            value={receipts.length}
            icon={<FileText className="h-5 w-5" />}
          />
          <MetricCard
            label="Pending Inbound"
            value={pendingReceiptsCount}
            color="warning"
            icon={<ArrowDownToLine className="h-5 w-5 text-amber-500" />}
          />
          <MetricCard
            label="Units Expected"
            value={totalExpectedUnits.toLocaleString()}
            icon={<Package className="h-5 w-5" />}
          />
          <MetricCard
            label="Units Received & Stocked"
            value={totalReceivedUnits.toLocaleString()}
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
              placeholder="Search by receipt #, vendor, reference..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="fs-input pl-9"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Status:</span>
            <div className="flex rounded-lg p-1 border" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              {['ALL', 'DRAFT', 'WAITING', 'PARTIAL', 'DONE', 'CANCELLED'].map(tab => (
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

        {/* Receipts Table */}
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
              icon={<ArrowDownToLine className="h-10 w-10" />}
              title="No inbound receipts found"
              description={searchQuery ? 'No documents matched your search.' : 'No receipts created yet.'}
              action={
                <button onClick={handleOpenCreate} className="fs-btn-primary">
                  <Plus className="h-4 w-4 mr-2 inline" /> Create Receipt
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
                    <th>Receipt #</th>
                    <th>Supplier</th>
                    <th>Warehouse</th>
                    <th>Items</th>
                    <th>Expected</th>
                    <th>Received</th>
                    <th>Status</th>
                    <th>Expected Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(rec => {
                    const expQty = rec.lines.reduce((s, l) => s + Number(l.expected_quantity), 0);
                    const recQty = rec.lines.reduce((s, l) => s + Number(l.received_quantity), 0);
                    const pct = expQty > 0 ? Math.min(100, Math.round((recQty / expQty) * 100)) : 0;

                    return (
                      <tr key={rec.id} className="hover:bg-[var(--surface-muted)] transition-colors">
                        <td className="font-mono text-xs font-bold text-[var(--primary)]">
                          <button
                            onClick={() => { setSelectedReceipt(rec); setDrawerOpen(true); }}
                            className="hover:underline text-left"
                          >
                            {rec.receipt_number}
                          </button>
                          {rec.reference_number && (
                            <span className="block text-[10px] text-[var(--text-muted)] font-normal font-sans">
                              Ref: {rec.reference_number}
                            </span>
                          )}
                        </td>
                        <td className="text-sm font-semibold text-[var(--text-primary)]">
                          {rec.supplier?.name || 'Standard Vendor'}
                        </td>
                        <td className="text-xs text-[var(--text-secondary)]">
                          {rec.warehouse?.name || 'Main Warehouse'}
                        </td>
                        <td>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
                            {rec.lines.length} SKU{rec.lines.length > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="text-xs font-medium">{expQty.toLocaleString()}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-emerald-500">{recQty.toLocaleString()}</span>
                            <div className="w-16 h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)]">{pct}%</span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={rec.status} size="sm" />
                        </td>
                        <td className="text-xs text-[var(--text-secondary)]">
                          {rec.expected_date ? new Date(rec.expected_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setSelectedReceipt(rec); setDrawerOpen(true); }}
                              className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {rec.status !== 'DONE' && rec.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleOpenValidate(rec)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center gap-1"
                                title="Validate Receipt & Increase Stock"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Validate
                              </button>
                            )}
                            {rec.status !== 'DONE' && rec.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleCancel(rec)}
                                className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10"
                                title="Cancel Receipt"
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

        {/* Create Receipt Modal */}
        <Modal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Inbound Receipt"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Supplier / Vendor *
                </label>
                <select
                  required
                  value={form.supplier_id}
                  onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                  className="fs-input"
                >
                  <option value="">Select Vendor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Destination Warehouse *
                </label>
                <select
                  required
                  value={form.warehouse_id}
                  onChange={e => {
                    const whId = e.target.value;
                    const selWh = warehouses.find(w => w.id === whId);
                    const defLoc = selWh?.locations?.[0]?.id || '';
                    setForm({ ...form, warehouse_id: whId });
                    setLines(lines.map(l => ({ ...l, destination_location_id: defLoc })));
                  }}
                  className="fs-input"
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={form.expected_date}
                  onChange={e => setForm({ ...form, expected_date: e.target.value })}
                  className="fs-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  PO / Invoice Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-88319"
                  value={form.reference_number}
                  onChange={e => setForm({ ...form, reference_number: e.target.value })}
                  className="fs-input font-mono text-sm"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  Receiving Items ({lines.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Item Line
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {lines.map((line, idx) => {
                  const selWh = warehouses.find(w => w.id === form.warehouse_id);
                  const availableLocations = selWh?.locations || [];

                  return (
                    <div key={idx} className="p-3 rounded-lg border flex flex-col sm:flex-row items-center gap-3 bg-[var(--surface-muted)]" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-[10px] font-medium uppercase text-[var(--text-muted)] mb-1">Product</label>
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

                      <div className="w-full sm:w-28">
                        <label className="block text-[10px] font-medium uppercase text-[var(--text-muted)] mb-1">Expected Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={line.expected_quantity}
                          onChange={e => {
                            const newLines = [...lines];
                            newLines[idx].expected_quantity = parseInt(e.target.value) || 1;
                            setLines(newLines);
                          }}
                          className="fs-input text-xs font-bold"
                        />
                      </div>

                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-[10px] font-medium uppercase text-[var(--text-muted)] mb-1">Location</label>
                        <select
                          value={line.destination_location_id}
                          onChange={e => {
                            const newLines = [...lines];
                            newLines[idx].destination_location_id = e.target.value;
                            setLines(newLines);
                          }}
                          className="fs-input text-xs"
                        >
                          {availableLocations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length === 1}
                        className="text-xs p-1 text-red-500 hover:bg-red-500/10 rounded disabled:opacity-30 mt-4 sm:mt-0"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
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
                {isProcessing ? 'Creating...' : 'Save Draft Receipt'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Validate Receipt Modal */}
        <Modal
          open={validateModalOpen}
          onClose={() => setValidateModalOpen(false)}
          title={`Validate Receipt ${selectedReceipt?.receipt_number}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">
              Confirm physical quantities received into warehouse storage locations. This operation will commit to the immutable ledger and update authoritative stock.
            </p>

            <div className="space-y-3">
              {selectedReceipt?.lines.map(line => {
                const vl = validationLines.find(v => v.id === line.id);
                return (
                  <div key={line.id} className="p-3 rounded-lg border bg-[var(--surface-muted)] flex items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{line.product?.name || 'Item'}</p>
                      <p className="text-xs font-mono text-[var(--text-muted)]">SKU: {line.product?.sku}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Expected: <strong>{line.expected_quantity}</strong> | Previously Received: {line.received_quantity}
                      </p>
                    </div>

                    <div className="w-32">
                      <label className="block text-[10px] uppercase font-semibold text-[var(--text-muted)] mb-1">
                        Receive Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={line.expected_quantity - line.received_quantity}
                        value={vl?.received ?? 0}
                        onChange={e => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setValidationLines(
                            validationLines.map(v => (v.id === line.id ? { ...v, received: val } : v))
                          );
                        }}
                        className="fs-input font-bold text-sm text-emerald-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setValidateModalOpen(false)}
                className="fs-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteValidate}
                disabled={isProcessing}
                className="fs-btn-primary bg-emerald-600 hover:bg-emerald-700"
              >
                {isProcessing ? 'Validating Stock...' : 'Confirm & Post to Ledger'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Detail Drawer */}
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={`Receipt ${selectedReceipt?.receipt_number}`}
        >
          {selectedReceipt && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {selectedReceipt.receipt_number}
                  </h3>
                  {selectedReceipt.reference_number && (
                    <p className="text-xs text-[var(--text-muted)]">PO Ref: {selectedReceipt.reference_number}</p>
                  )}
                </div>
                <StatusBadge status={selectedReceipt.status} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[var(--text-muted)]">Supplier:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedReceipt.supplier?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[var(--text-muted)]">Warehouse:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedReceipt.warehouse?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[var(--text-muted)]">Created Date:</span>
                  <span className="text-[var(--text-secondary)]">{new Date(selectedReceipt.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Product Lines */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-[var(--text-secondary)]">
                  Line Items
                </h4>
                <div className="space-y-2">
                  {selectedReceipt.lines.map(line => (
                    <div key={line.id} className="p-3 rounded-lg border bg-[var(--surface-muted)] text-xs space-y-1" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between font-semibold text-sm text-[var(--text-primary)]">
                        <span>{line.product?.name}</span>
                        <span>{line.received_quantity} / {line.expected_quantity} units</span>
                      </div>
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span>SKU: {line.product?.sku}</span>
                        <span>Location: {line.destination_location?.name || 'Default Bay'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedReceipt.status !== 'DONE' && selectedReceipt.status !== 'CANCELLED' && (
                <div className="pt-4 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => { setDrawerOpen(false); handleOpenValidate(selectedReceipt); }}
                    className="fs-btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2 inline" /> Validate Receipt
                  </button>
                  <button
                    onClick={() => { setDrawerOpen(false); handleCancel(selectedReceipt); }}
                    className="p-2 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-semibold"
                  >
                    Cancel
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
