'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import {
  Package,
  Layers,
  MapPin,
  AlertTriangle,
  XCircle,
  Database,
  Building2,
  Loader2,
  Users,
  Activity,
  CheckCircle,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { fetchDashboardSummary, DashboardSummary } from '@/services/dashboard.service';
import { DEMO_ACTIVITY, DEMO_MOVEMENT, DEMO_WAREHOUSES, DEMO_PRODUCTS } from '@/lib/demo/data';

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        setLoading(true);
        const data = await fetchDashboardSummary(token);
        setSummary(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message || 'Failed to load dashboard summary');
      } finally {
        setLoading(false);
      }
    }
    
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, token]);

  if (authLoading || (loading && !summary)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-sm text-slate-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppShell title="Dashboard" activeItem="Dashboard">
      <div className="space-y-8 pb-12">
        
        {/* HEADER */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-xl">
          <div className="relative z-10 max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user.first_name} {user.last_name}
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                {user.role}
              </span>
              <span className="text-sm text-slate-400">{user.email}</span>
            </div>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Here&apos;s a summary of your organization&apos;s inventory.
            </p>
          </div>
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* KPI GRID */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex items-start gap-4">
              <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400 mt-1">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Products</p>
                <h3 className="text-2xl font-bold text-white mt-1">{summary.total_products}</h3>
                <p className="text-xs text-slate-500 mt-1">12 added this month</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex items-start gap-4">
              <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-400 mt-1">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Active Products</p>
                <h3 className="text-2xl font-bold text-white mt-1">{summary.active_products}</h3>
                <p className="text-xs text-slate-500 mt-1">Ready for fulfillment</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex items-start gap-4">
              <div className="rounded-lg bg-indigo-500/10 p-2.5 text-indigo-400 mt-1">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Warehouses</p>
                <h3 className="text-2xl font-bold text-white mt-1">{summary.total_warehouses}</h3>
                <p className="text-xs text-slate-500 mt-1">Across multiple cities</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex items-start gap-4">
              <div className="rounded-lg bg-purple-500/10 p-2.5 text-purple-400 mt-1">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Locations</p>
                <h3 className="text-2xl font-bold text-white mt-1">{summary.total_locations}</h3>
                <p className="text-xs text-slate-500 mt-1">Active storage zones</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex items-start gap-4">
              <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400 mt-1">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Stock Units</p>
                <h3 className="text-2xl font-bold text-white mt-1">{summary.total_stock_units.toLocaleString()}</h3>
                <p className="text-xs text-slate-500 mt-1">Tracked physical units</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex items-start gap-4">
              <div className="rounded-lg bg-orange-500/10 p-2.5 text-orange-400 mt-1">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Low Stock Items</p>
                <h3 className="text-2xl font-bold text-white mt-1">{summary.low_stock_products}</h3>
                <p className="text-xs text-orange-500/80 mt-1">Requires attention</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex items-start gap-4">
              <div className="rounded-lg bg-red-500/10 p-2.5 text-red-400 mt-1">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Out of Stock</p>
                <h3 className="text-2xl font-bold text-white mt-1">{summary.out_of_stock_products}</h3>
                <p className="text-xs text-red-500/80 mt-1">Immediate action required</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex items-start gap-4">
              <div className="rounded-lg bg-sky-500/10 p-2.5 text-sky-400 mt-1">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Active Users</p>
                <h3 className="text-2xl font-bold text-white mt-1">{summary.active_users || 0}</h3>
                <p className="text-xs text-slate-500 mt-1">Across 4 roles</p>
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY OVERVIEW & MOVEMENT */}
        {summary && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-6">Inventory Overview</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Physical Stock</span>
                      <span className="font-semibold text-white">{summary.physical_stock?.toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-500 w-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Reserved Stock</span>
                      <span className="font-semibold text-amber-400">{summary.reserved_stock?.toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: '12%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Available Stock</span>
                      <span className="font-semibold text-emerald-400">{summary.available_stock?.toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '88%' }} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-800">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-slate-400">Inventory Accuracy</p>
                    <h4 className="text-3xl font-bold text-white mt-1">{summary.inventory_accuracy}%</h4>
                  </div>
                  <div className="flex items-center text-emerald-400 text-sm font-medium">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    +0.2%
                  </div>
                </div>
              </div>
            </div>

            {/* INVENTORY MOVEMENT CHART */}
            <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Inventory Movement (7 Days)</h3>
              {isDemo ? (
                <div className="h-64 flex items-end gap-2 sm:gap-4 px-2">
                  {DEMO_MOVEMENT.map((m, i) => {
                    const max = 700;
                    const rH = (m.received / max) * 100;
                    const iH = (m.issued / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                        <div className="w-full flex justify-center gap-1 sm:gap-2 h-full items-end pb-8">
                          <div 
                            className="w-1/3 bg-emerald-500/80 hover:bg-emerald-400 rounded-t-sm transition-all" 
                            style={{ height: `${rH}%` }}
                            title={`Received: ${m.received}`}
                          />
                          <div 
                            className="w-1/3 bg-blue-500/80 hover:bg-blue-400 rounded-t-sm transition-all" 
                            style={{ height: `${iH}%` }}
                            title={`Issued: ${m.issued}`}
                          />
                        </div>
                        <span className="absolute bottom-0 text-[10px] sm:text-xs text-slate-500">{m.day.substring(0, 3)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                  Movement data not available.
                </div>
              )}
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-3 w-3 rounded-sm bg-emerald-500/80"></span> Received
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-3 w-3 rounded-sm bg-blue-500/80"></span> Issued
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STOCK STATUS + WAREHOUSES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Stock Status</h3>
            {summary?.stock_status && (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-sm text-slate-300">Healthy</span>
                  </div>
                  <span className="font-semibold text-white">{summary.stock_status.healthy}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-sm text-slate-300">Low Stock</span>
                  </div>
                  <span className="font-semibold text-white">{summary.stock_status.low}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500"></span>
                    <span className="text-sm text-slate-300">Critical</span>
                  </div>
                  <span className="font-semibold text-white">{summary.stock_status.critical}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                    <span className="text-sm text-slate-300">Out of Stock</span>
                  </div>
                  <span className="font-semibold text-white">{summary.stock_status.out}</span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-6 overflow-x-auto">
            <h3 className="text-lg font-semibold text-white mb-6">Warehouse Overview</h3>
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">Warehouse</th>
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 font-medium">Stock Units</th>
                  <th className="pb-3 font-medium">Utilization</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {(isDemo ? DEMO_WAREHOUSES : []).map(w => (
                  <tr key={w.id} className="hover:bg-slate-800/20">
                    <td className="py-3 font-medium text-white">{w.name}</td>
                    <td className="py-3">{w.city}</td>
                    <td className="py-3">{w.stock_units.toLocaleString()}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${w.utilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${w.utilization}%` }} />
                        </div>
                        <span className="text-xs">{w.utilization}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        w.status === 'Healthy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!isDemo && (
                  <tr><td colSpan={5} className="py-6 text-center text-slate-500">Warehouse data not available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* LOW STOCK ALERTS */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Low Stock Alerts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(isDemo ? DEMO_PRODUCTS.filter(p => p.status !== 'Healthy') : []).map(p => (
              <div key={p.id} className="border border-slate-800 bg-slate-900 rounded-lg p-4 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    p.status === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {p.status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{p.sku}</span>
                </div>
                <h4 className="font-medium text-white mb-4 flex-1">{p.name}</h4>
                <div className="flex justify-between text-sm border-t border-slate-800 pt-3">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs">Available</span>
                    <span className="text-white font-semibold">{p.current_stock}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-slate-500 text-xs">Reorder Pt</span>
                    <span className="text-slate-400">{p.reorder_point}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!isDemo && (
            <div className="text-center py-6 text-slate-500 text-sm">Low stock alerts not available.</div>
          )}
        </div>

        {/* RECENT ACTIVITY & TOP MOVING */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RECENT ACTIVITY */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              Recent Activity
            </h3>
            <div className="space-y-4">
              {(isDemo ? DEMO_ACTIVITY : []).map(act => (
                <div key={act.id} className="flex gap-4 p-3 rounded-lg hover:bg-slate-800/30 transition-colors">
                  <div className="text-xs font-mono text-slate-500 mt-1">{act.time}</div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-white">{act.action}</span>
                      <span className={`text-sm font-medium ${act.qty.startsWith('+') ? 'text-emerald-400' : 'text-amber-400'}`}>{act.qty}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-400">{act.product}</span>
                      <span className="text-xs text-slate-500">{act.warehouse}</span>
                    </div>
                  </div>
                </div>
              ))}
              {!isDemo && <div className="text-center py-4 text-slate-500 text-sm">Activity not available.</div>}
            </div>
          </div>

          {/* TOP MOVING PRODUCTS */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Top Moving Products
            </h3>
            <div className="space-y-4">
              {(isDemo ? DEMO_PRODUCTS.slice(0, 5) : []).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/20 border border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center text-slate-400">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{p.name}</div>
                      <div className="text-xs font-mono text-slate-500">{p.sku}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">{p.current_stock} <span className="text-slate-500 text-xs font-normal">in stock</span></div>
                    <div className="text-xs text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                      <ArrowUpRight className="h-3 w-3" /> High Demand
                    </div>
                  </div>
                </div>
              ))}
              {!isDemo && <div className="text-center py-4 text-slate-500 text-sm">Top moving products not available.</div>}
            </div>
          </div>
        </div>

        {/* PHASE 1 SYSTEM STATUS */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-400" />
            Phase 1 System Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: 'Authentication', status: 'Operational' },
              { name: 'Organizations', status: 'Operational' },
              { name: 'Users & Roles', status: 'Operational' },
              { name: 'Products', status: 'Operational' },
              { name: 'Categories', status: 'Operational' },
              { name: 'UOM', status: 'Operational' },
              { name: 'Warehouses', status: 'Operational' },
              { name: 'Locations', status: 'Operational' },
              { name: 'Inventory', status: 'Operational' },
              { name: 'Database', status: 'Connected' },
              { name: 'API', status: 'Online' },
            ].map(mod => (
              <div key={mod.name} className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/40">
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                <div>
                  <div className="text-xs font-medium text-white">{mod.name}</div>
                  <div className="text-[10px] text-emerald-500 uppercase tracking-wider">{mod.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
