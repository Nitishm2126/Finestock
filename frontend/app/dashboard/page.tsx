'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { MetricCard, StatusBadge, SkeletonCard, EmptyState } from '@/components/ui/UI';
import {
  Package, Building2, Boxes, AlertTriangle, XCircle, Users, Activity,
  CheckCircle, TrendingUp, MapPin, ArrowUpRight, Database, Shield,
  BarChart2, Truck, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  Sliders, Bell, Radio, ExternalLink
} from 'lucide-react';
import { fetchDashboardSummary, DashboardSummary } from '@/services/dashboard.service';
import { fetchAlerts, OperationalAlert, acknowledgeAlert } from '@/services/alert.service';
import { fetchLiveOperations, LiveOperation, RealtimeClient, RealtimeStatus } from '@/services/realtime.service';
import { fetchMovements, MovementEvent } from '@/services/movement.service';
import { DEMO_MOVEMENT, DEMO_WAREHOUSES, DEMO_PRODUCTS } from '@/lib/demo/data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useToast } from '@/lib/ui/ToastProvider';

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MovementChart({ data }: { data: any[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const gridColor = isDark ? '#2B3037' : '#E2E5DF';
  const textColor = isDark ? '#7E8792' : '#98A2B3';

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={4} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: textColor }} tickLine={false} axisLine={false}
          tickFormatter={(v: string) => v.substring(0, 3)} />
        <YAxis tick={{ fontSize: 11, fill: textColor }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: isDark ? 'var(--surface-elevated)' : '#fff',
            border: '1px solid var(--border)',
            borderRadius: 10,
            color: 'var(--text-primary)',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: textColor, paddingTop: 8 }} />
        <Bar dataKey="received" name="Inbound Received" fill="var(--primary)" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="issued" name="Outbound Dispatched" fill="var(--success)" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [liveOps, setLiveOps] = useState<LiveOperation[]>([]);
  const [movements, setMovements] = useState<MovementEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState<RealtimeStatus>('connecting');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    try {
      const [sum, alt, ops, movs] = await Promise.all([
        fetchDashboardSummary(token || ''),
        fetchAlerts(token || ''),
        fetchLiveOperations(token || ''),
        fetchMovements(token || '', { limit: 6 }),
      ]);
      setSummary(sum);
      setAlerts(alt);
      setLiveOps(ops);
      setMovements(movs);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();

      // Connect to Realtime WebSocket
      const client = new RealtimeClient(token || '');
      const unbindStatus = client.onStatusChange(st => setWsStatus(st));
      const unbindEvent = client.onEvent(ev => {
        loadData();
      });
      client.connect();

      // Auto poll every 10s
      const timer = setInterval(loadData, 10000);

      return () => {
        unbindStatus();
        unbindEvent();
        client.disconnect();
        clearInterval(timer);
      };
    }
  }, [isAuthenticated, token, loadData]);

  const handleAckAlert = async (id: string) => {
    try {
      await acknowledgeAlert(id, token || '');
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_acknowledged: true } : a));
      toast.success('Alert Acknowledged', 'Operational alert marked as read.');
    } catch {
      toast.error('Action Failed', 'Could not update alert.');
    }
  };

  if (authLoading) return null;
  if (!user) return null;

  return (
    <AppShell title="Dashboard">
      <div className="fs-page-inner space-y-8">

        {/* Hero & Command Center Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                Autonomous Inventory Platform &bull; Release A
              </span>
              <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                wsStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {wsStatus === 'connected' ? 'Live Streaming' : 'Offline'}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Operational Command Center
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Real-time visibility across physical stock, reserved allocations, and active warehouse operations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button className="fs-btn-secondary" onClick={() => router.push('/operations/live')}>
              <Activity className="h-4 w-4" /> Live Board
            </button>
            <button className="fs-btn-secondary" onClick={() => router.push('/ledger')}>
              <Database className="h-4 w-4" /> Ledger Audit
            </button>
            <button className="fs-btn-primary" onClick={() => router.push('/inventory')}>
              <Boxes className="h-4 w-4" /> Stock Control
            </button>
          </div>
        </div>

        {/* Core KPI Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <MetricCard label="Products" value={summary.total_products} icon={<Package className="h-4 w-4" />} />
            <MetricCard label="Warehouses" value={summary.total_warehouses} icon={<Building2 className="h-4 w-4" />} />
            <MetricCard label="Physical Units" value={(summary.physical_stock ?? 0).toLocaleString()} icon={<Boxes className="h-4 w-4" />} />
            <MetricCard label="Reserved" value={(summary.reserved_stock ?? 0).toLocaleString()} color="warning" />
            <MetricCard label="Available" value={(summary.available_stock ?? 0).toLocaleString()} color="success" />
            <MetricCard label="Low Stock" value={summary.low_stock_products} color={summary.low_stock_products > 0 ? 'warning' : 'default'} />
            <MetricCard label="Out of Stock" value={summary.out_of_stock_products} color={summary.out_of_stock_products > 0 ? 'danger' : 'default'} />
            <MetricCard label="Active Operations" value={liveOps.length} color="primary" icon={<Activity className="h-4 w-4" />} />
          </div>
        ) : null}

        {/* Operational Workflows Status (Receipts, Deliveries, Transfers, Audits) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div
            onClick={() => router.push('/operations/receipts')}
            className="fs-surface p-4 rounded-xl border cursor-pointer hover:border-[var(--primary)] transition-all flex items-center justify-between"
            style={{ borderColor: 'var(--border)' }}
          >
            <div>
              <p className="text-xs uppercase font-semibold text-[var(--text-muted)]">Inbound Receipts</p>
              <p className="text-xl font-bold mt-1 text-[var(--text-primary)]">
                {liveOps.filter(o => o.type === 'RECEIPT').length} Active
              </p>
              <span className="text-[11px] text-emerald-500 font-medium">Vendor Inflows &rarr;</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <ArrowDownToLine className="h-5 w-5" />
            </div>
          </div>

          <div
            onClick={() => router.push('/operations/deliveries')}
            className="fs-surface p-4 rounded-xl border cursor-pointer hover:border-[var(--primary)] transition-all flex items-center justify-between"
            style={{ borderColor: 'var(--border)' }}
          >
            <div>
              <p className="text-xs uppercase font-semibold text-[var(--text-muted)]">Outbound Deliveries</p>
              <p className="text-xl font-bold mt-1 text-[var(--text-primary)]">
                {liveOps.filter(o => o.type === 'DELIVERY').length} In Flight
              </p>
              <span className="text-[11px] text-blue-500 font-medium">Picking & Dispatch &rarr;</span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <ArrowUpFromLine className="h-5 w-5" />
            </div>
          </div>

          <div
            onClick={() => router.push('/operations/transfers')}
            className="fs-surface p-4 rounded-xl border cursor-pointer hover:border-[var(--primary)] transition-all flex items-center justify-between"
            style={{ borderColor: 'var(--border)' }}
          >
            <div>
              <p className="text-xs uppercase font-semibold text-[var(--text-muted)]">Internal Transfers</p>
              <p className="text-xl font-bold mt-1 text-[var(--text-primary)]">
                {liveOps.filter(o => o.type === 'TRANSFER').length} Moving
              </p>
              <span className="text-[11px] text-purple-500 font-medium">Atomic Balancing &rarr;</span>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
          </div>

          <div
            onClick={() => router.push('/operations/adjustments')}
            className="fs-surface p-4 rounded-xl border cursor-pointer hover:border-[var(--primary)] transition-all flex items-center justify-between"
            style={{ borderColor: 'var(--border)' }}
          >
            <div>
              <p className="text-xs uppercase font-semibold text-[var(--text-muted)]">Stock Adjustments</p>
              <p className="text-xl font-bold mt-1 text-[var(--text-primary)]">
                {liveOps.filter(o => o.type === 'ADJUSTMENT').length} Pending
              </p>
              <span className="text-[11px] text-amber-500 font-medium">Cycle Count Audits &rarr;</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Sliders className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Live Feeds: Real-time Operational Alerts + Recent Ledger Movements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Operational Alerts */}
          <div className="fs-surface p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Actionable Stock Alerts ({alerts.filter(a => !a.is_acknowledged).length})
                </h2>
              </div>
            </div>

            {alerts.length === 0 ? (
              <p className="text-xs text-center py-8 text-[var(--text-muted)]">No active operational alerts.</p>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {alerts.map(a => (
                  <div
                    key={a.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs transition-colors ${
                      a.is_acknowledged
                        ? 'border-[var(--border)] bg-[var(--surface-muted)] opacity-60'
                        : a.severity === 'CRITICAL'
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-amber-500/30 bg-amber-500/5'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={a.severity} size="sm" />
                        <span className="font-semibold text-[var(--text-primary)]">{a.title}</span>
                      </div>
                      <p className="text-[var(--text-secondary)]">{a.message}</p>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {!a.is_acknowledged && (
                      <button
                        onClick={() => handleAckAlert(a.id)}
                        className="px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Activity & Ledger Movements Feed */}
          <div className="fs-surface p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[var(--primary)]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Live Ledger Activity Feed
                </h2>
              </div>
              <button
                onClick={() => router.push('/operations/history')}
                className="text-xs text-[var(--primary)] hover:underline flex items-center"
              >
                Movement History &rarr;
              </button>
            </div>

            {movements.length === 0 ? (
              <p className="text-xs text-center py-8 text-[var(--text-muted)]">No recent ledger events.</p>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {movements.map(m => {
                  const delta = Number(m.quantity_delta);
                  return (
                    <div
                      key={m.id}
                      onClick={() => router.push(`/inventory/${m.product_id}`)}
                      className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-between gap-3 text-xs hover:border-[var(--primary)] transition-all cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={m.event_type || m.transaction_type || 'TRANSACTION'} size="sm" />
                          <span className="font-semibold text-[var(--text-primary)]">{m.product_name}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {m.warehouse_name} &bull; {m.location_name} &bull; by {m.actor_name}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`font-mono font-bold text-xs ${
                          delta > 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                        <span className="block text-[10px] text-[var(--text-muted)] font-mono">
                          Bal: {Number(m.balance_after ?? m.quantity_after)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Warehouse Network Distribution */}
        <div className="fs-surface overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                <Building2 className="inline h-4 w-4 mr-2" style={{ color: 'var(--info)' }} />
                Multi-Warehouse Network Distribution
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Physical distribution across storage facilities</p>
            </div>
            <button className="fs-btn-secondary" onClick={() => router.push('/warehouses')}>Manage Warehouses</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--border)', ['--tw-divide-opacity' as string]: 1 }}>
            {DEMO_WAREHOUSES.map(w => (
              <div key={w.id} className="p-5 hover:bg-[var(--surface-muted)] transition-colors cursor-pointer" onClick={() => router.push('/warehouses')}
                style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{w.name}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--primary)' }}>{w.code}</p>
                  </div>
                  <StatusBadge status={w.status === 'Healthy' ? 'Healthy' : 'Attention'} size="sm" />
                </div>
                <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex justify-between">
                    <span>Locations</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{w.locations_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock Units</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{w.stock_units.toLocaleString()}</span>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Utilization</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{w.utilization}%</span>
                    </div>
                    <div className="fs-progress-bg h-1.5">
                      <div className="fs-progress-fill" style={{ width: `${w.utilization}%`, background: w.utilization > 70 ? 'var(--warning)' : 'var(--success)', height: '100%' }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
