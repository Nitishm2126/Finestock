'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState, SkeletonCard } from '@/components/ui/UI';
import { Modal, Drawer } from '@/components/ui/Overlay';
import { useToast } from '@/lib/ui/ToastProvider';
import {
  ArrowUpFromLine, Plus, Search, Filter, CheckCircle, XCircle, Eye,
  Building, MapPin, Calendar, FileText, Package, ArrowRight, ShieldAlert,
  Lock, CheckSquare, Box, Send
} from 'lucide-react';
import {
  DeliveryOrder,
  fetchDeliveries,
  createDelivery,
  reserveDelivery,
  deliverOrder,
  cancelDelivery,
} from '@/services/delivery.service';
import { fetchWarehouses, Warehouse } from '@/services/warehouse.service';
import { fetchProducts, Product } from '@/services/product.service';

export default function DeliveriesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Drawer
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOrder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [form, setForm] = useState({
    customer_name: '',
    warehouse_id: '',
    destination_address: '',
    priority: 'MEDIUM',
    scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    notes: '',
  });

  const [lines, setLines] = useState<Array<{
    product_id: string;
    requested_quantity: number;
    location_id: string;
  }>>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dels, whs, prods] = await Promise.all([
        fetchDeliveries(token || ''),
        fetchWarehouses(token || ''),
        fetchProducts(token || ''),
      ]);
      setDeliveries(dels);
      setWarehouses(whs);
      setProducts(prods);
    } catch {
      toast.error('Failed to load deliveries', 'Could not retrieve data from server.');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  const handleOpenCreate = () => {
    const defaultWh = warehouses[0]?.id || '';
    const defaultLoc = warehouses[0]?.locations?.[0]?.id || '';
    const defaultProd = products[0]?.id || '';

    setForm({
      customer_name: '',
      warehouse_id: defaultWh,
      destination_address: '',
      priority: 'MEDIUM',
      scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      notes: '',
    });

    setLines([
      {
        product_id: defaultProd,
        requested_quantity: 10,
        location_id: defaultLoc,
      },
    ]);
    setCreateModalOpen(true);
  };

  const handleAddLine = () => {
    const defaultProd = products[0]?.id || '';
    const selWh = warehouses.find(w => w.id === form.warehouse_id);
    const defaultLoc = selWh?.locations?.[0]?.id || '';
    setLines([...lines, { product_id: defaultProd, requested_quantity: 5, location_id: defaultLoc }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.warehouse_id) {
      toast.warning('Incomplete Form', 'Customer Name and Warehouse are required.');
      return;
    }
    if (lines.length === 0 || lines.some(l => !l.product_id || l.requested_quantity <= 0)) {
      toast.warning('Invalid Lines', 'Ensure all items have a product and requested quantity > 0.');
      return;
    }

    setIsProcessing(true);
    try {
      await createDelivery(
        {
          ...form,
          lines: lines.map(l => ({
            ...l,
            requested_quantity: Number(l.requested_quantity),
          })),
        },
        token || ''
      );
      toast.success('Delivery Created', 'New outbound delivery order registered.');
      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Creation Failed', err.message || 'Unable to create delivery order.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reserve Stock Action
  const handleReserve = async (del: DeliveryOrder) => {
    setIsProcessing(true);
    try {
      await reserveDelivery(del.id, token || '');
      toast.success(
        'Stock Reserved',
        `Inventory allocated for ${del.delivery_number}. Stock locked against double-allocation.`
      );
      loadData();
    } catch (err: any) {
      toast.error('Insufficient Stock', err.message || 'Cannot reserve: Available stock is insufficient.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Deliver Action
  const handleDeliver = async (del: DeliveryOrder) => {
    if (!confirm(`Confirm physical outbound dispatch for ${del.delivery_number}? Stock will be deducted and ledger updated.`)) return;
    setIsProcessing(true);
    try {
      await deliverOrder(del.id, token || '');
      toast.success(
        'Dispatched & Delivered',
        `${del.delivery_number} marked DELIVERED. Inventory consumed & DELIVERY_OUT ledger event recorded.`
      );
      setDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Delivery Failed', err.message || 'Failed to complete delivery.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel Action
  const handleCancel = async (del: DeliveryOrder) => {
    if (!confirm(`Are you sure you want to cancel ${del.delivery_number}? Any reserved stock will be automatically released.`)) return;
    try {
      await cancelDelivery(del.id, token || '');
      toast.success('Order Cancelled', `${del.delivery_number} cancelled and reservations released.`);
      setDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Cancellation Failed', err.message || 'Could not cancel order.');
    }
  };

  // Filtered List
  const filtered = deliveries.filter(d => {
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      d.delivery_number.toLowerCase().includes(q) ||
      d.customer_name.toLowerCase().includes(q) ||
      (d.destination_address && d.destination_address.toLowerCase().includes(q));

    return matchStatus && matchSearch;
  });

  const totalRequested = deliveries.reduce(
    (acc, d) => acc + d.lines.reduce((s, l) => s + Number(l.requested_quantity), 0),
    0
  );
  const totalDelivered = deliveries.reduce(
    (acc, d) => acc + d.lines.reduce((s, l) => s + Number(l.delivered_quantity), 0),
    0
  );
  const activeOrdersCount = deliveries.filter(d => !['DELIVERED', 'CANCELLED'].includes(d.status)).length;

  return (
    <AppShell title="Outbound Deliveries">
      <div className="fs-page-inner space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ArrowUpFromLine className="h-6 w-6 text-[var(--primary)]" />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Outbound Deliveries (Fulfillment)
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Manage customer dispatches with non-negative stock reservation locks, picking, and ledger consumption.
            </p>
          </div>
          <button onClick={handleOpenCreate} className="fs-btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Delivery Order
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Total Orders"
            value={deliveries.length}
            icon={<FileText className="h-5 w-5" />}
          />
          <MetricCard
            label="Active Outbound"
            value={activeOrdersCount}
            color="warning"
            icon={<ArrowUpFromLine className="h-5 w-5 text-amber-500" />}
          />
          <MetricCard
            label="Units Requested"
            value={totalRequested.toLocaleString()}
            icon={<Package className="h-5 w-5" />}
          />
          <MetricCard
            label="Units Dispatched"
            value={totalDelivered.toLocaleString()}
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
              placeholder="Search by order #, customer, address..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="fs-input pl-9"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Status:</span>
            <div className="flex rounded-lg p-1 border" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              {['ALL', 'DRAFT', 'WAITING', 'PICKING', 'PICKED', 'PACKING', 'READY', 'DELIVERED'].map(tab => (
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

        {/* Deliveries Table */}
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
              icon={<ArrowUpFromLine className="h-10 w-10" />}
              title="No delivery orders found"
              description={searchQuery ? 'No records matched your search filters.' : 'No outbound orders currently on file.'}
              action={
                <button onClick={handleOpenCreate} className="fs-btn-primary">
                  <Plus className="h-4 w-4 mr-2 inline" /> Create Delivery Order
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
                    <th>Delivery #</th>
                    <th>Customer</th>
                    <th>Warehouse</th>
                    <th>Items</th>
                    <th>Requested</th>
                    <th>Fulfilled</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(del => {
                    const reqQty = del.lines.reduce((s, l) => s + Number(l.requested_quantity), 0);
                    const delQty = del.lines.reduce((s, l) => s + Number(l.delivered_quantity), 0);
                    const pct = reqQty > 0 ? Math.min(100, Math.round((delQty / reqQty) * 100)) : 0;

                    return (
                      <tr key={del.id} className="hover:bg-[var(--surface-muted)] transition-colors">
                        <td className="font-mono text-xs font-bold text-[var(--primary)]">
                          <button
                            onClick={() => { setSelectedDelivery(del); setDrawerOpen(true); }}
                            className="hover:underline text-left"
                          >
                            {del.delivery_number}
                          </button>
                          {del.scheduled_date && (
                            <span className="block text-[10px] text-[var(--text-muted)] font-normal font-sans">
                              Due: {new Date(del.scheduled_date).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                        <td className="text-sm font-semibold text-[var(--text-primary)]">
                          {del.customer_name}
                        </td>
                        <td className="text-xs text-[var(--text-secondary)]">
                          {del.warehouse?.name || 'Main Warehouse'}
                        </td>
                        <td>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
                            {del.lines.length} SKU{del.lines.length > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="text-xs font-medium">{reqQty.toLocaleString()}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-blue-500">{delQty.toLocaleString()}</span>
                            <div className="w-16 h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)]">{pct}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            del.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {del.priority}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={del.status} size="sm" />
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setSelectedDelivery(del); setDrawerOpen(true); }}
                              className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                              title="View Order"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {/* State transitions */}
                            {del.status === 'DRAFT' && (
                              <button
                                onClick={() => handleReserve(del)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 flex items-center gap-1"
                                title="Reserve Stock against Availability"
                              >
                                <Lock className="h-3 w-3" /> Reserve
                              </button>
                            )}

                            {['WAITING', 'PICKING'].includes(del.status) && (
                              <button
                                onClick={() => router.push('/operations/picking')}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 flex items-center gap-1"
                                title="Go to Picking Station"
                              >
                                <CheckSquare className="h-3 w-3" /> Pick
                              </button>
                            )}

                            {['PICKED', 'PACKING'].includes(del.status) && (
                              <button
                                onClick={() => router.push('/operations/packing')}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border border-purple-500/20 flex items-center gap-1"
                                title="Go to Packing Station"
                              >
                                <Box className="h-3 w-3" /> Pack
                              </button>
                            )}

                            {del.status === 'READY' && (
                              <button
                                onClick={() => handleDeliver(del)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center gap-1"
                                title="Complete Dispatch & Deduct Stock"
                              >
                                <Send className="h-3 w-3" /> Dispatch
                              </button>
                            )}

                            {!['DELIVERED', 'CANCELLED'].includes(del.status) && (
                              <button
                                onClick={() => handleCancel(del)}
                                className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10"
                                title="Cancel Order"
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
          title="Create Outbound Delivery Order"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp / Retail Partner"
                  value={form.customer_name}
                  onChange={e => setForm({ ...form, customer_name: e.target.value })}
                  className="fs-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Origin Warehouse *
                </label>
                <select
                  required
                  value={form.warehouse_id}
                  onChange={e => {
                    const whId = e.target.value;
                    const selWh = warehouses.find(w => w.id === whId);
                    const defLoc = selWh?.locations?.[0]?.id || '';
                    setForm({ ...form, warehouse_id: whId });
                    setLines(lines.map(l => ({ ...l, location_id: defLoc })));
                  }}
                  className="fs-input"
                >
                  <option value="">Select Origin Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                  className="fs-input"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High (Expedite)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Scheduled Dispatch Date
                </label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
                  className="fs-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Destination Address
                </label>
                <input
                  type="text"
                  placeholder="Shipping address"
                  value={form.destination_address}
                  onChange={e => setForm({ ...form, destination_address: e.target.value })}
                  className="fs-input"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  Items to Fulfill ({lines.length})
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
                        <label className="block text-[10px] font-medium uppercase text-[var(--text-muted)] mb-1">Requested Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={line.requested_quantity}
                          onChange={e => {
                            const newLines = [...lines];
                            newLines[idx].requested_quantity = parseInt(e.target.value) || 1;
                            setLines(newLines);
                          }}
                          className="fs-input text-xs font-bold"
                        />
                      </div>

                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-[10px] font-medium uppercase text-[var(--text-muted)] mb-1">Source Location</label>
                        <select
                          value={line.location_id}
                          onChange={e => {
                            const newLines = [...lines];
                            newLines[idx].location_id = e.target.value;
                            setLines(newLines);
                          }}
                          className="fs-input text-xs"
                        >
                          {availableLocations.map((loc: any) => (
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
                {isProcessing ? 'Saving...' : 'Create Delivery Order'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Detail Drawer */}
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={`Order ${selectedDelivery?.delivery_number}`}
        >
          {selectedDelivery && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {selectedDelivery.delivery_number}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">Customer: {selectedDelivery.customer_name}</p>
                </div>
                <StatusBadge status={selectedDelivery.status} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[var(--text-muted)]">Warehouse:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedDelivery.warehouse?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[var(--text-muted)]">Destination:</span>
                  <span className="text-[var(--text-secondary)]">{selectedDelivery.destination_address || 'Standard Address'}</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[var(--text-muted)]">Priority:</span>
                  <span className="font-bold text-[var(--primary)]">{selectedDelivery.priority}</span>
                </div>
              </div>

              {/* Product Lines */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-[var(--text-secondary)]">
                  Fulfillment Status per SKU
                </h4>
                <div className="space-y-2">
                  {selectedDelivery.lines.map((line: any) => (
                    <div key={line.id} className="p-3 rounded-lg border bg-[var(--surface-muted)] text-xs space-y-1.5" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between font-semibold text-sm text-[var(--text-primary)]">
                        <span>{line.product?.name || line.product_name || 'Item'}</span>
                        <span>{line.delivered_quantity} / {line.requested_quantity} dispatched</span>
                      </div>
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span>SKU: {line.product?.sku || line.sku || 'SKU'}</span>
                        <span>Location: {line.location?.name || 'Bin Bay'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t text-[10px] text-center" style={{ borderColor: 'var(--border)' }}>
                        <div>Picked: <strong className="text-blue-400">{line.picked_quantity}</strong></div>
                        <div>Packed: <strong className="text-purple-400">{line.packed_quantity}</strong></div>
                        <div>Delivered: <strong className="text-emerald-400">{line.delivered_quantity}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions in drawer */}
              <div className="pt-4 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
                {selectedDelivery.status === 'DRAFT' && (
                  <button
                    onClick={() => handleReserve(selectedDelivery)}
                    disabled={isProcessing}
                    className="fs-btn-primary flex items-center justify-center gap-2"
                  >
                    <Lock className="h-4 w-4" /> Reserve Stock
                  </button>
                )}

                {['WAITING', 'PICKING'].includes(selectedDelivery.status) && (
                  <button
                    onClick={() => router.push('/operations/picking')}
                    className="fs-btn-primary bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <CheckSquare className="h-4 w-4" /> Open Picking Station
                  </button>
                )}

                {['PICKED', 'PACKING'].includes(selectedDelivery.status) && (
                  <button
                    onClick={() => router.push('/operations/packing')}
                    className="fs-btn-primary bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
                  >
                    <Box className="h-4 w-4" /> Open Packing Station
                  </button>
                )}

                {selectedDelivery.status === 'READY' && (
                  <button
                    onClick={() => handleDeliver(selectedDelivery)}
                    disabled={isProcessing}
                    className="fs-btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" /> Dispatch & Consume Stock
                  </button>
                )}

                {!['DELIVERED', 'CANCELLED'].includes(selectedDelivery.status) && (
                  <button
                    onClick={() => handleCancel(selectedDelivery)}
                    className="w-full py-2 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-semibold"
                  >
                    Cancel Order
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
