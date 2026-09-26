'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState, SkeletonCard } from '@/components/ui/UI';
import { useToast } from '@/lib/ui/ToastProvider';
import {
  Activity, Radio, RefreshCw, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, CheckSquare, Box, Sliders, Clock, User, Warehouse, ChevronRight
} from 'lucide-react';
import {
  LiveOperation,
  fetchLiveOperations,
  RealtimeClient,
  RealtimeStatus,
} from '@/services/realtime.service';

export default function LiveOperationsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [operations, setOperations] = useState<LiveOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState<RealtimeStatus>('connecting');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchLiveOperations(token || '');
      setOperations(data);
      setLastRefreshed(new Date());
    } catch {
      toast.error('Connection Notice', 'Could not refresh live board data.');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();

      // Setup WebSocket
      const client = new RealtimeClient(token || '');
      const unbindStatus = client.onStatusChange(status => {
        setWsStatus(status);
      });
      const unbindEvent = client.onEvent(event => {
        // Automatically reload active operations on any state event
        loadData();
      });
      client.connect();

      // Fallback polling interval every 8s
      const timer = setInterval(loadData, 8000);

      return () => {
        unbindStatus();
        unbindEvent();
        client.disconnect();
        clearInterval(timer);
      };
    }
  }, [isAuthenticated, token, loadData]);

  // Group operations by domain
  const receiving = operations.filter(o => o.type === 'RECEIPT');
  const deliveries = operations.filter(o => o.type === 'DELIVERY');
  const transfers = operations.filter(o => o.type === 'TRANSFER');
  const adjustments = operations.filter(o => o.type === 'ADJUSTMENT');

  const getStatusIndicator = () => {
    switch (wsStatus) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Stream Active
          </span>
        );
      case 'reconnecting':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-spin" /> Reconnecting...
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> Offline Sync
          </span>
        );
    }
  };

  return (
    <AppShell title="Live Operations Board">
      <div className="fs-page-inner space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-[var(--primary)]" />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Live Operations Command Board
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Real-time multi-terminal status across receiving docks, picking bays, packing lines, and transfer routes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {getStatusIndicator()}
            <button
              onClick={() => { setLoading(true); loadData(); }}
              className="fs-btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
              title="Manual Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync
            </button>
          </div>
        </div>

        {/* Operational Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Inbound Inflow"
            value={receiving.length}
            icon={<ArrowDownToLine className="h-5 w-5 text-emerald-500" />}
          />
          <MetricCard
            label="Outbound Orders"
            value={deliveries.length}
            icon={<ArrowUpFromLine className="h-5 w-5 text-blue-500" />}
          />
          <MetricCard
            label="Internal Transfers"
            value={transfers.length}
            icon={<ArrowLeftRight className="h-5 w-5 text-purple-500" />}
          />
          <MetricCard
            label="Audits in Flight"
            value={adjustments.length}
            icon={<Sliders className="h-5 w-5 text-amber-500" />}
          />
        </div>

        {/* Live Boards Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inbound Receipts Board */}
          <div className="fs-surface p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-emerald-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Receiving Docks ({receiving.length})
                </h2>
              </div>
              <button
                onClick={() => router.push('/operations/receipts')}
                className="text-xs text-[var(--primary)] hover:underline flex items-center"
              >
                View All <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {receiving.length === 0 ? (
              <p className="text-xs text-center py-8 text-[var(--text-muted)]">No active receipts currently on dock.</p>
            ) : (
              <div className="space-y-3">
                {receiving.map(op => (
                  <div key={op.document_number} className="p-3 rounded-xl border bg-[var(--surface-muted)] space-y-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{op.document_number}</span>
                      <StatusBadge status={op.status} size="sm" />
                    </div>
                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>Warehouse: <strong>{op.warehouse_name}</strong></span>
                      <span>Operator: {op.operator}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                        <span>Physical Receipt Progress</span>
                        <span>{op.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${op.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outbound Fulfillment Board */}
          <div className="fs-surface p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="h-5 w-5 text-blue-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Fulfillment & Picking Lines ({deliveries.length})
                </h2>
              </div>
              <button
                onClick={() => router.push('/operations/deliveries')}
                className="text-xs text-[var(--primary)] hover:underline flex items-center"
              >
                View All <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {deliveries.length === 0 ? (
              <p className="text-xs text-center py-8 text-[var(--text-muted)]">No active outbound orders in processing.</p>
            ) : (
              <div className="space-y-3">
                {deliveries.map(op => (
                  <div key={op.document_number} className="p-3 rounded-xl border bg-[var(--surface-muted)] space-y-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{op.document_number}</span>
                      <StatusBadge status={op.status} size="sm" />
                    </div>
                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>Customer: <strong>{op.operator}</strong></span>
                      <span>Warehouse: {op.warehouse_name}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                        <span>Pick & Pack Progress</span>
                        <span>{op.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${op.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Transfers Board */}
          <div className="fs-surface p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-purple-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Internal Transfer Routes ({transfers.length})
                </h2>
              </div>
              <button
                onClick={() => router.push('/operations/transfers')}
                className="text-xs text-[var(--primary)] hover:underline flex items-center"
              >
                View All <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {transfers.length === 0 ? (
              <p className="text-xs text-center py-8 text-[var(--text-muted)]">No inter-warehouse transfers in transit.</p>
            ) : (
              <div className="space-y-3">
                {transfers.map(op => (
                  <div key={op.document_number} className="p-3 rounded-xl border bg-[var(--surface-muted)] space-y-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{op.document_number}</span>
                      <StatusBadge status={op.status} size="sm" />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{op.warehouse_name}</p>
                    <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                      <span>Started: {new Date(op.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>Updated: {new Date(op.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cycle Count Audits Board */}
          <div className="fs-surface p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-amber-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Active Audits & Discrepancies ({adjustments.length})
                </h2>
              </div>
              <button
                onClick={() => router.push('/operations/adjustments')}
                className="text-xs text-[var(--primary)] hover:underline flex items-center"
              >
                View All <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {adjustments.length === 0 ? (
              <p className="text-xs text-center py-8 text-[var(--text-muted)]">No discrepancies pending approval.</p>
            ) : (
              <div className="space-y-3">
                {adjustments.map(op => (
                  <div key={op.document_number} className="p-3 rounded-xl border bg-[var(--surface-muted)] space-y-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{op.document_number}</span>
                      <StatusBadge status={op.status} size="sm" />
                    </div>
                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>Warehouse: <strong>{op.warehouse_name}</strong></span>
                      <span>Auditor: {op.operator}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
