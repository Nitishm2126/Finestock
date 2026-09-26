'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { MetricCard, StatusBadge, SkeletonCard, EmptyState } from '@/components/ui/UI';
import {
  Package, Building2, Boxes, AlertTriangle, XCircle, Users, Activity,
  CheckCircle, TrendingUp, MapPin, ArrowUpRight, Database, Shield,
  BarChart2
} from 'lucide-react';
import { fetchDashboardSummary, DashboardSummary } from '@/services/dashboard.service';
import { DEMO_ACTIVITY, DEMO_MOVEMENT, DEMO_WAREHOUSES, DEMO_PRODUCTS } from '@/lib/demo/data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { useTheme } from '@/lib/theme/ThemeProvider';

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
        <Bar dataKey="received" name="Received" fill="var(--primary)" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="issued" name="Issued" fill="var(--success)" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchDashboardSummary(token!);
        setSummary(data);
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated) loadData();
  }, [isAuthenticated, token]);

  if (authLoading) return null;
  if (!user) return null;

  const criticalProducts = DEMO_PRODUCTS.filter(p => p.status !== 'Healthy');

  return (
    <AppShell title="Dashboard">
      <div className="fs-page-inner space-y-8">

        {/* Hero */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--primary)' }}>
              Welcome back, {user.first_name}
            </p>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Inventory Command Center
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              Real-time visibility across products, warehouses and stock movements.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button className="fs-btn-secondary" onClick={() => router.push('/ledger')}>
              <Database className="h-4 w-4" /> View Ledger
            </button>
            <button className="fs-btn-primary" onClick={() => router.push('/operations')}>
              <ArrowUpRight className="h-4 w-4" /> View Operations
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total Products" value={summary.total_products} subValue="Tracked in catalog" icon={<Package className="h-4 w-4" />} />
            <MetricCard label="Active Products" value={summary.active_products} subValue="Ready for fulfillment" color="success" icon={<CheckCircle className="h-4 w-4" />} />
            <MetricCard label="Warehouses" value={summary.total_warehouses} subValue="Across multiple cities" icon={<Building2 className="h-4 w-4" />} />
            <MetricCard label="Total Locations" value={summary.total_locations} subValue="Active storage zones" icon={<MapPin className="h-4 w-4" />} />
            <MetricCard label="Stock Units" value={summary.total_stock_units.toLocaleString()} subValue="Total tracked units" icon={<Boxes className="h-4 w-4" />} />
            <MetricCard label="Low Stock Items" value={summary.low_stock_products} subValue="Requires reorder" color="warning" icon={<AlertTriangle className="h-4 w-4" />} />
            <MetricCard label="Out of Stock" value={summary.out_of_stock_products} subValue="Immediate action required" color="danger" icon={<XCircle className="h-4 w-4" />} />
            <MetricCard label="Active Users" value={summary.active_users || 0} subValue="Across 4 roles" icon={<Users className="h-4 w-4" />} />
          </div>
        ) : null}

        {/* Inventory Health + Movement */}
        {summary && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inventory Health */}
            <div className="fs-surface p-6">
              <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Inventory Health</h2>
              <div className="space-y-4">
                {[
                  { label: 'Physical Stock', value: (summary.physical_stock ?? 0).toLocaleString(), pct: 100, color: 'var(--text-secondary)' },
                  { label: 'Reserved', value: (summary.reserved_stock ?? 0).toLocaleString(), pct: Math.round(((summary.reserved_stock ?? 0) / (summary.physical_stock || 1)) * 100), color: 'var(--warning)' },
                  { label: 'Available', value: (summary.available_stock ?? 0).toLocaleString(), pct: Math.round(((summary.available_stock ?? 0) / (summary.physical_stock || 1)) * 100), color: 'var(--success)' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                    </div>
                    <div className="fs-progress-bg h-1.5">
                      <div className="fs-progress-fill" style={{ width: `${item.pct}%`, background: item.color, height: '100%' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Inventory Accuracy</p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>{summary.inventory_accuracy}%</p>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--success)' }}>↑ +0.2%</span>
                </div>
              </div>
            </div>

            {/* Movement Chart */}
            <div className="fs-surface p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Inventory Movement</h2>
                <div className="flex gap-1">
                  {['7D', '30D'].map((p, i) => (
                    <button key={p} className={i === 0 ? 'fs-btn-primary' : 'fs-btn-secondary'} style={{ padding: '4px 12px', fontSize: 12 }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              {isDemo ? (
                <MovementChart data={DEMO_MOVEMENT} />
              ) : (
                <EmptyState icon={<BarChart2 className="h-10 w-10" />} title="Movement data unavailable" description="Connect to the live API to see inventory movement data." />
              )}
            </div>
          </div>
        )}

        {/* Critical Inventory */}
        <div className="fs-surface overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                <AlertTriangle className="inline h-4 w-4 mr-2" style={{ color: 'var(--warning)' }} />
                Critical Inventory
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Items below reorder threshold requiring attention</p>
            </div>
            <button className="fs-btn-secondary" onClick={() => router.push('/inventory')}>View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="fs-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Warehouse</th>
                  <th className="text-right">Current Stock</th>
                  <th className="text-right">Reorder Point</th>
                  <th>Risk</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {criticalProducts.map(p => (
                  <tr key={p.id}>
                    <td>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.category.name}</p>
                    </td>
                    <td><span className="font-mono text-xs" style={{ color: 'var(--primary)' }}>{p.sku}</span></td>
                    <td><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Chennai Main</span></td>
                    <td className="text-right">
                      <span className="font-semibold" style={{ color: 'var(--danger)' }}>{p.current_stock}</span>
                    </td>
                    <td className="text-right" style={{ color: 'var(--text-secondary)' }}>{p.reorder_point}</td>
                    <td><StatusBadge status={p.status || 'Healthy'} /></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="fs-btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => router.push('/inventory')}>View</button>
                        <button className="fs-btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => router.push('/operations')}>Reorder</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity + Warehouse Network */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="fs-surface p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                <Activity className="inline h-4 w-4 mr-2" style={{ color: 'var(--info)' }} />
                Recent Activity
              </h2>
              <button className="fs-btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => router.push('/ledger')}>View All</button>
            </div>
            <div className="space-y-3">
              {DEMO_ACTIVITY.map(act => (
                <div key={act.id} className="flex gap-3 items-start p-3 rounded-xl transition-colors hover:bg-[var(--surface-muted)] cursor-pointer" onClick={() => router.push('/ledger')}>
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full mt-1.5" style={{ background: act.qty.startsWith('+') ? 'var(--success)' : 'var(--warning)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{act.action}</p>
                      <span className="text-xs font-semibold flex-shrink-0 ml-2" style={{ color: act.qty.startsWith('+') ? 'var(--success)' : 'var(--warning)' }}>{act.qty}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{act.product} · {act.warehouse}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Moving Products */}
          <div className="fs-surface p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                <TrendingUp className="inline h-4 w-4 mr-2" style={{ color: 'var(--success)' }} />
                Top Moving Products
              </h2>
              <button className="fs-btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => router.push('/products')}>View All</button>
            </div>
            <div className="space-y-2">
              {DEMO_PRODUCTS.slice(0, 6).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--surface-muted)] cursor-pointer" onClick={() => router.push('/products')}>
                  <span className="text-xs font-bold w-5 text-center" style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.current_stock}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>units</p>
                  </div>
                  <StatusBadge status={p.status || 'Healthy'} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Warehouse Network */}
        <div className="fs-surface overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              <Building2 className="inline h-4 w-4 mr-2" style={{ color: 'var(--info)' }} />
              Warehouse Network
            </h2>
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

        {/* System Health */}
        <div className="fs-surface p-6">
          <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
            <Shield className="inline h-4 w-4 mr-2" style={{ color: 'var(--primary)' }} />
            Phase 1 System Status
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              'Authentication', 'Organizations', 'Users & Roles',
              'Products', 'Warehouses', 'Inventory',
              'Operations', 'Ledger', 'Categories',
              'UOM', 'Database', 'API',
            ].map(mod => (
              <div key={mod} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--success-soft)' }}>
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: 'var(--success)' }} />
                <span className="text-xs font-medium truncate" style={{ color: 'var(--success)' }}>{mod}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
