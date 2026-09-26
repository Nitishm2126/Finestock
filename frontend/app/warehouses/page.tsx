'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Building2, Plus, Loader2, Map, LayoutGrid, Search, Filter } from 'lucide-react';
import { fetchWarehouses, Warehouse } from '@/services/warehouse.service';

export default function WarehousesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        setLoading(true);
        const data = await fetchWarehouses(token);
        setWarehouses(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated) loadData();
  }, [isAuthenticated, token]);

  if (authLoading || (loading && !warehouses.length)) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
    </div>
  );

  return (
    <AppShell title="Warehouses" activeItem="Warehouses">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-xl">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Building2 className="w-64 h-64 -mt-10 -mr-10 text-emerald-500" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Warehouse Network</h2>
              <p className="text-sm text-slate-400 mt-1 max-w-xl">Monitor locations, capacity and inventory distribution.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-lg font-medium transition-colors border border-slate-700">
                <Map className="h-4 w-4" /> Network Map
              </button>
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20">
                <Plus className="h-4 w-4" /> Add Warehouse
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Total Warehouses</div>
            <div className="text-2xl font-bold text-white">{warehouses.length}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Active Locations</div>
            <div className="text-2xl font-bold text-emerald-400">{warehouses.reduce((acc, w) => acc + w.locations_count, 0)}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Total Capacity</div>
            <div className="text-2xl font-bold text-blue-400">{(warehouses.reduce((acc, w) => acc + (w.stock_units ?? 0), 0)).toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Average Utilization</div>
            <div className="text-2xl font-bold text-amber-400">{Math.round(warehouses.reduce((acc, w) => acc + (w.utilization ?? 0), 0) / (warehouses.length || 1))}%</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search warehouses..." 
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 border border-slate-800 bg-slate-900/60 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              <Filter className="h-4 w-4" /> Filter
            </button>
            <button className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 border border-slate-800 bg-slate-900/60 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              <LayoutGrid className="h-4 w-4" /> View
            </button>
          </div>
        </div>

        {error && <div className="text-red-400 bg-red-400/5 border border-red-400/20 p-4 rounded-lg text-sm text-center">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-500 bg-slate-900/60 border border-slate-800 rounded-xl">
              No warehouses found.
            </div>
          ) : (
            warehouses.map((w) => (
              <div key={w.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors cursor-pointer" onClick={() => router.push(`/warehouses/${w.id}`)}>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${w.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${w.is_active ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                    {w.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{w.name}</h3>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm font-mono text-slate-400">{w.code}</p>
                  <p className="text-xs text-slate-500">{w.city}</p>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-slate-800/50 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Locations</span>
                    <span className="text-white font-medium">{w.locations_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stock Units</span>
                    <span className="text-white font-medium">{(w.stock_units ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Utilization</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${(w.utilization ?? 0) > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${w.utilization ?? 0}%` }} />
                      </div>
                      <span className="text-white font-medium text-xs">{w.utilization ?? 0}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500">Status</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      w.status === 'Healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {w.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
