'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState, SkeletonCard } from '@/components/ui/UI';
import { useToast } from '@/lib/ui/ToastProvider';
import {
  History, ArrowLeft, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Sliders,
  User, Warehouse, MapPin, FileText, Package, Clock, ShieldCheck
} from 'lucide-react';
import {
  fetchProductTimeline,
  StockTimelineResponse,
} from '@/services/inventory.service';

export default function ProductTimelinePage() {
  const router = useRouter();
  const params = useParams();
  const productId = (params?.productId as string) || '';

  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [data, setData] = useState<StockTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await fetchProductTimeline(productId, token || '');
      setData(res);
    } catch {
      toast.error('Failed to load timeline', 'Could not retrieve immutable ledger entries for this SKU.');
    } finally {
      setLoading(false);
    }
  }, [productId, token, toast]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'RECEIPT_IN':
        return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />;
      case 'DELIVERY_OUT':
        return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
      case 'TRANSFER_IN':
      case 'TRANSFER_OUT':
        return <ArrowLeftRight className="h-4 w-4 text-purple-500" />;
      case 'ADJUSTMENT':
      case 'ADJUSTMENT_IN':
      case 'ADJUSTMENT_OUT':
        return <Sliders className="h-4 w-4 text-amber-500" />;
      default:
        return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <AppShell title={data?.product_name || 'Stock Timeline'}>
      <div className="fs-page-inner max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div>
          <button
            onClick={() => router.push('/inventory')}
            className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Inventory Control Center
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <History className="h-6 w-6 text-[var(--primary)]" />
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {data?.product_name || 'Product Stock Timeline'}
                </h1>
              </div>
              <p className="text-xs font-mono mt-1 text-[var(--primary)]">
                SKU: {data?.sku || '...'}
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-[var(--surface)] text-xs text-[var(--text-secondary)]" style={{ borderColor: 'var(--border)' }}>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Immutable Ledger Source of Truth</span>
            </div>
          </div>
        </div>

        {/* Current Balances Ribbon */}
        {data && (
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              label="Physical On Hand"
              value={Number(data.current_physical).toLocaleString()}
              icon={<Package className="h-5 w-5" />}
            />
            <MetricCard
              label="Reserved Allocation"
              value={Number(data.current_reserved).toLocaleString()}
              color="warning"
            />
            <MetricCard
              label="Net Available"
              value={Number(data.current_available).toLocaleString()}
              color="success"
            />
          </div>
        )}

        {/* Timeline Event Feed */}
        <div className="fs-surface p-6 space-y-6">
          <div className="border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Chronological Audit Trail ({data?.timeline.length || 0} events)
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Every balance alteration is permanently anchored to an append-only ledger transaction.
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : !data || data.timeline.length === 0 ? (
            <EmptyState
              icon={<History className="h-10 w-10" />}
              title="No ledger events found"
              description="This product does not have any recorded stock movements in the ledger yet."
            />
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border)]">
              {data.timeline.map((event, idx) => {
                const delta = Number(event.quantity_delta);

                return (
                  <div key={event.id || idx} className="relative group">
                    {/* Timeline Node Bullet */}
                    <div className="absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface)] border-2 border-[var(--primary)] text-white shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                    </div>

                    {/* Event Card */}
                    <div className="p-4 rounded-xl border bg-[var(--surface-muted)] space-y-3 transition-colors hover:border-[var(--primary)]" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-[var(--surface)] border" style={{ borderColor: 'var(--border)' }}>
                            {getEventIcon(event.transaction_type)}
                          </div>
                          <span className="font-bold text-sm text-[var(--text-primary)]">
                            {event.transaction_type.replace('_', ' ')}
                          </span>
                          <StatusBadge status={event.transaction_type} size="sm" />
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Location & Deltas */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-[10px] uppercase text-[var(--text-muted)] block">Warehouse & Location</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {event.warehouse_name} &bull; {event.location_name}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase text-[var(--text-muted)] block">Quantity Delta</span>
                          <span className={`font-mono font-bold text-sm ${
                            delta > 0 ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                            {delta > 0 ? `+${delta}` : delta} units
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase text-[var(--text-muted)] block">Resulting Balance</span>
                          <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                            {Number(event.quantity_after)} units
                          </span>
                        </div>
                      </div>

                      {/* Reference & Actor */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-[11px] text-[var(--text-muted)]" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          <span>Authorized Actor: <strong>{event.actor_name}</strong></span>
                        </div>
                        {event.reference_id && (
                          <div className="flex items-center gap-1.5 font-mono">
                            <FileText className="h-3 w-3" />
                            <span>Ref Doc: {event.reference_type?.toUpperCase()} #{event.reference_id}</span>
                          </div>
                        )}
                        {event.notes && (
                          <p className="w-full text-xs italic text-[var(--text-secondary)] mt-1">
                            &ldquo;{event.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
