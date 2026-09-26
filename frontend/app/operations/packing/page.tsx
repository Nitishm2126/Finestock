'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState, SkeletonCard } from '@/components/ui/UI';
import { useToast } from '@/lib/ui/ToastProvider';
import {
  Box, Search, ArrowRight, CheckCircle2, PackageCheck, Send, Warehouse, MapPin, Package
} from 'lucide-react';
import {
  DeliveryOrder,
  fetchDeliveries,
  packDelivery,
  deliverOrder,
} from '@/services/delivery.service';

export default function PackingStationPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [packQuantities, setPackQuantities] = useState<Record<string, number>>({});
  const [boxCount, setBoxCount] = useState(1);
  const [packageWeight, setPackageWeight] = useState('2.5');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchDeliveries(token || '');
      // Filter orders ready for packaging: PICKED, PACKING, READY
      const packingQueue = all.filter(o => ['PICKED', 'PACKING', 'READY'].includes(o.status));
      setOrders(packingQueue);
      if (packingQueue.length > 0 && !selectedOrder) {
        selectOrderForPacking(packingQueue[0]);
      }
    } catch {
      toast.error('Failed to load packing queue', 'Could not retrieve packing orders.');
    } finally {
      setLoading(false);
    }
  }, [token, toast, selectedOrder]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  const selectOrderForPacking = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    const initialPacks: Record<string, number> = {};
    order.lines.forEach(line => {
      const remainingToPack = Math.max(0, line.picked_quantity - line.packed_quantity);
      initialPacks[line.id] = remainingToPack;
    });
    setPackQuantities(initialPacks);
  };

  const handleConfirmPack = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      await packDelivery(selectedOrder.id, packQuantities, token || '');
      toast.success(
        'Packaging Complete!',
        `${selectedOrder.delivery_number} packaged and moved to READY state.`
      );
      const all = await fetchDeliveries(token || '');
      const packingQueue = all.filter(o => ['PICKED', 'PACKING', 'READY'].includes(o.status));
      setOrders(packingQueue);
      if (packingQueue.length > 0) {
        selectOrderForPacking(packingQueue[0]);
      } else {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      toast.error('Packing Failed', err.message || 'Error saving packing records.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImmediateDispatch = async () => {
    if (!selectedOrder) return;
    if (!confirm(`Complete dispatch for ${selectedOrder.delivery_number}? Authoritative stock will be decremented.`)) return;
    setSubmitting(true);
    try {
      await deliverOrder(selectedOrder.id, token || '');
      toast.success(
        'Order Dispatched!',
        `${selectedOrder.delivery_number} marked DELIVERED. Inventory consumed from ledger.`
      );
      const all = await fetchDeliveries(token || '');
      const packingQueue = all.filter(o => ['PICKED', 'PACKING', 'READY'].includes(o.status));
      setOrders(packingQueue);
      if (packingQueue.length > 0) {
        selectOrderForPacking(packingQueue[0]);
      } else {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      toast.error('Dispatch Failed', err.message || 'Error completing delivery.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Packing Station">
      <div className="fs-page-inner space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Box className="h-6 w-6 text-purple-500" />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Packing Station & Freight Prep
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Inspect picked items, box inventory, generate package weights, and transition orders to READY.
            </p>
          </div>
          <button
            onClick={() => router.push('/operations/deliveries')}
            className="fs-btn-secondary flex items-center gap-2"
          >
            View Deliveries Overview <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="In Packing Bay"
            value={orders.length}
            icon={<Box className="h-5 w-5 text-purple-500" />}
          />
          <MetricCard
            label="Ready for Carrier"
            value={orders.filter(o => o.status === 'READY').length}
            color="success"
            icon={<PackageCheck className="h-5 w-5 text-emerald-500" />}
          />
          <MetricCard
            label="Selected Order"
            value={selectedOrder?.delivery_number || 'None'}
            color="primary"
            icon={<Warehouse className="h-5 w-5" />}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonCard />
            <div className="md:col-span-2">
              <SkeletonCard />
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="fs-surface">
            <EmptyState
              icon={<CheckCircle2 className="h-12 w-12 text-emerald-500" />}
              title="All packaging lines are clear!"
              description="No picked orders awaiting box packing at this time."
              action={
                <button onClick={() => router.push('/operations/picking')} className="fs-btn-primary">
                  Go to Picking Station
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Orders Queue */}
            <div className="fs-surface p-4 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Orders in Packing Bay ({orders.length})
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {orders.map(order => {
                  const isSelected = selectedOrder?.id === order.id;
                  const totalReq = order.lines.reduce((s, l) => s + l.requested_quantity, 0);
                  const totalPacked = order.lines.reduce((s, l) => s + l.packed_quantity, 0);

                  return (
                    <div
                      key={order.id}
                      onClick={() => selectOrderForPacking(order)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-[var(--border)] hover:bg-[var(--surface-muted)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                          {order.delivery_number}
                        </span>
                        <StatusBadge status={order.status} size="sm" />
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {order.customer_name}
                      </p>
                      <div className="flex items-center justify-between mt-2 text-[11px] text-[var(--text-muted)]">
                        <span>{order.lines.length} SKUs</span>
                        <span>{totalPacked} / {totalReq} Packed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Packing Work Area */}
            <div className="lg:col-span-2 fs-surface p-6 space-y-6">
              {selectedOrder ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          Packing: {selectedOrder.delivery_number}
                        </h2>
                        <StatusBadge status={selectedOrder.status} />
                      </div>
                      <p className="text-xs mt-1 text-[var(--text-secondary)]">
                        Customer: <strong>{selectedOrder.customer_name}</strong> | Shipping to: {selectedOrder.destination_address || 'Regional DC'}
                      </p>
                    </div>
                  </div>

                  {/* Parcel Configuration */}
                  <div className="p-4 rounded-xl border bg-[var(--surface-muted)] grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                        Total Cartons / Packages
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={boxCount}
                        onChange={e => setBoxCount(parseInt(e.target.value) || 1)}
                        className="fs-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                        Gross Weight (kg)
                      </label>
                      <input
                        type="text"
                        value={packageWeight}
                        onChange={e => setPackageWeight(e.target.value)}
                        className="fs-input font-mono"
                      />
                    </div>
                  </div>

                  {/* Pack Lines */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Items to Pack ({selectedOrder.lines.length})
                    </h3>

                    {selectedOrder.lines.map((line: any) => {
                      const req = Number(line.requested_quantity);
                      const picked = Number(line.picked_quantity);
                      const currentPacked = Number(line.packed_quantity);
                      const toPack = packQuantities[line.id] ?? 0;
                      const isComplete = currentPacked >= req;

                      return (
                        <div
                          key={line.id}
                          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
                            isComplete ? 'border-purple-500/30 bg-purple-500/5' : 'border-[var(--border)] bg-[var(--surface-muted)]'
                          }`}
                        >
                          <div className="flex-1 w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-purple-500" />
                              <span className="font-semibold text-sm text-[var(--text-primary)]">
                                {line.product?.name || line.product_name || 'Item'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                              <span>SKU: <strong className="font-mono text-[var(--text-secondary)]">{line.product?.sku || line.sku || 'SKU'}</strong></span>
                              <span>Total Picked: <strong>{picked}</strong></span>
                              <span>Already Packed: <strong className="text-purple-400">{currentPacked}</strong></span>
                            </div>
                          </div>

                          <div className="w-full sm:w-44 flex items-center justify-between sm:justify-end gap-3">
                            <label className="text-xs font-semibold text-[var(--text-secondary)] sm:hidden">
                              Pack Qty:
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={picked - currentPacked}
                              disabled={isComplete}
                              value={toPack}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setPackQuantities({ ...packQuantities, [line.id]: val });
                              }}
                              className="fs-input w-24 text-center font-bold text-sm text-purple-500"
                            />
                            {isComplete ? (
                              <CheckCircle2 className="h-6 w-6 text-purple-500 flex-shrink-0" />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPackQuantities({ ...packQuantities, [line.id]: picked - currentPacked })}
                                className="text-[11px] text-purple-500 hover:underline whitespace-nowrap"
                              >
                                Max All
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit / Finish Packaging */}
                  <div className="pt-4 border-t flex flex-wrap justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleConfirmPack}
                      className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                    >
                      <PackageCheck className="h-4 w-4" />
                      {submitting ? 'Updating...' : 'Confirm Packed & Mark READY'}
                    </button>

                    {selectedOrder.status === 'READY' && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleImmediateDispatch}
                        className="fs-btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" /> Dispatch Carrier Now
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-16 text-center text-sm text-[var(--text-muted)]">
                  Select an order from the bay to package items.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
