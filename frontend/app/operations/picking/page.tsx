'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState, SkeletonCard } from '@/components/ui/UI';
import { useToast } from '@/lib/ui/ToastProvider';
import {
  CheckSquare, Search, ArrowRight, CheckCircle2, Box, Warehouse, MapPin, Package, AlertCircle
} from 'lucide-react';
import {
  DeliveryOrder,
  fetchDeliveries,
  pickDeliveryLine,
  reserveDelivery,
} from '@/services/delivery.service';

export default function PickingStationPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [pickQuantities, setPickQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchDeliveries(token || '');
      // Filter orders ready for picking: WAITING or PICKING
      const pickingQueue = all.filter(o => ['WAITING', 'PICKING', 'DRAFT'].includes(o.status));
      setOrders(pickingQueue);
      if (pickingQueue.length > 0 && !selectedOrder) {
        selectOrderForPicking(pickingQueue[0]);
      }
    } catch {
      toast.error('Failed to load picking queue', 'Could not retrieve outbound orders.');
    } finally {
      setLoading(false);
    }
  }, [token, toast, selectedOrder]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  const selectOrderForPicking = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    const initialPicks: Record<string, number> = {};
    order.lines.forEach(line => {
      const remainingToPick = Math.max(0, line.requested_quantity - line.picked_quantity);
      initialPicks[line.id] = remainingToPick;
    });
    setPickQuantities(initialPicks);
  };

  const handleConfirmPick = async () => {
    if (!selectedOrder) return;

    // Check if order needs reservation first
    if (selectedOrder.status === 'DRAFT') {
      try {
        await reserveDelivery(selectedOrder.id, token || '');
      } catch (err: any) {
        toast.error('Stock Unavailable', err.message || 'Cannot pick unreserved stock.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await pickDeliveryLine(selectedOrder.id, pickQuantities, token || '');
      toast.success(
        'Pick Confirmed!',
        `Picked items verified for ${selectedOrder.delivery_number}. Ready for packaging.`
      );
      // Reload queue
      const all = await fetchDeliveries(token || '');
      const pickingQueue = all.filter(o => ['WAITING', 'PICKING', 'DRAFT'].includes(o.status));
      setOrders(pickingQueue);
      if (pickingQueue.length > 0) {
        selectOrderForPicking(pickingQueue[0]);
      } else {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      toast.error('Picking Error', err.message || 'Could not record picking operation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Picking Station">
      <div className="fs-page-inner space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-[var(--primary)]" />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Picking Station & Dispatch Prep
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Locate warehouse storage bins, verify SKU labels, and enter physical picked quantities.
            </p>
          </div>
          <button
            onClick={() => router.push('/operations/packing')}
            className="fs-btn-secondary flex items-center gap-2"
          >
            <Box className="h-4 w-4" /> Go to Packing Station <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Orders in Queue"
            value={orders.length}
            icon={<CheckSquare className="h-5 w-5" />}
          />
          <MetricCard
            label="Selected Order"
            value={selectedOrder?.delivery_number || 'None'}
            color="primary"
            icon={<Warehouse className="h-5 w-5" />}
          />
          <MetricCard
            label="Priority Level"
            value={selectedOrder?.priority || 'NORMAL'}
            color={selectedOrder?.priority === 'HIGH' ? 'danger' : 'info'}
            icon={<AlertCircle className="h-5 w-5" />}
          />
        </div>

        {/* Main Interface: Left Column Orders, Right Column Picking Form */}
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
              title="All picking queues are clear!"
              description="No outbound orders currently pending physical warehouse picking."
              action={
                <button onClick={() => router.push('/operations/deliveries')} className="fs-btn-primary">
                  View All Deliveries
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Orders Queue */}
            <div className="fs-surface p-4 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Assigned Orders Queue ({orders.length})
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {orders.map(order => {
                  const isSelected = selectedOrder?.id === order.id;
                  const totalReq = order.lines.reduce((s, l) => s + l.requested_quantity, 0);
                  const totalPicked = order.lines.reduce((s, l) => s + l.picked_quantity, 0);

                  return (
                    <div
                      key={order.id}
                      onClick={() => selectOrderForPicking(order)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
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
                        <span>{totalPicked} / {totalReq} Picked</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Picking Form */}
            <div className="lg:col-span-2 fs-surface p-6 space-y-6">
              {selectedOrder ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          Picking Order: {selectedOrder.delivery_number}
                        </h2>
                        <StatusBadge status={selectedOrder.status} />
                      </div>
                      <p className="text-xs mt-1 text-[var(--text-secondary)]">
                        Customer: <strong>{selectedOrder.customer_name}</strong> | Warehouse: <strong>{selectedOrder.warehouse?.name}</strong>
                      </p>
                    </div>
                    {selectedOrder.destination_address && (
                      <div className="text-right text-xs text-[var(--text-muted)]">
                        <MapPin className="h-3.5 w-3.5 inline mr-1" />
                        {selectedOrder.destination_address}
                      </div>
                    )}
                  </div>

                  {/* Pick Lines */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Pick List Items ({selectedOrder.lines.length})
                    </h3>

                    {selectedOrder.lines.map(line => {
                      const req = Number(line.requested_quantity);
                      const currentPicked = Number(line.picked_quantity);
                      const toPick = pickQuantities[line.id] ?? 0;
                      const isComplete = currentPicked >= req;

                      return (
                        <div
                          key={line.id}
                          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
                            isComplete ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[var(--border)] bg-[var(--surface-muted)]'
                          }`}
                        >
                          <div className="flex-1 w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-[var(--primary)]" />
                              <span className="font-semibold text-sm text-[var(--text-primary)]">
                                {line.product?.name}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                              <span>SKU: <strong className="font-mono text-[var(--text-secondary)]">{line.product?.sku}</strong></span>
                              <span>Target Bin: <strong className="text-[var(--primary)]">{line.location?.name || 'Main Bay'}</strong></span>
                              <span>Requested: <strong>{req}</strong></span>
                              <span>Already Picked: <strong className="text-emerald-500">{currentPicked}</strong></span>
                            </div>
                          </div>

                          <div className="w-full sm:w-44 flex items-center justify-between sm:justify-end gap-3">
                            <label className="text-xs font-semibold text-[var(--text-secondary)] sm:hidden">
                              Pick Qty:
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={req - currentPicked}
                              disabled={isComplete}
                              value={toPick}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setPickQuantities({ ...pickQuantities, [line.id]: val });
                              }}
                              className="fs-input w-24 text-center font-bold text-sm"
                            />
                            {isComplete ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPickQuantities({ ...pickQuantities, [line.id]: req - currentPicked })}
                                className="text-[11px] text-[var(--primary)] hover:underline whitespace-nowrap"
                              >
                                Max All
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit / Confirm */}
                  <div className="pt-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleConfirmPick}
                      className="fs-btn-primary flex items-center gap-2 px-6 py-2.5"
                    >
                      <CheckSquare className="h-4 w-4" />
                      {submitting ? 'Recording Pick Operation...' : 'Confirm Picked Quantities'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-16 text-center text-sm text-[var(--text-muted)]">
                  Select an order from the queue to start picking.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
