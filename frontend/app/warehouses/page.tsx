'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Building2, Plus, Loader2 } from 'lucide-react';
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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Warehouses</h2>
            <p className="text-sm text-slate-400">Manage physical locations</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <Plus className="h-4 w-4" /> Add Warehouse
          </button>
        </div>

        {error && <div className="text-red-400 bg-red-400/10 p-3 rounded">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-500 bg-slate-900/60 border border-slate-800 rounded-xl">
              No warehouses found.
            </div>
          ) : (
            warehouses.map((w) => (
              <div key={w.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors cursor-pointer" onClick={() => router.push(`/warehouses/${w.id}`)}>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${w.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                    {w.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{w.name}</h3>
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
                    <span className="text-white font-medium">{w.stock_units?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Utilization</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${w.utilization && w.utilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${w.utilization || 0}%` }} />
                      </div>
                      <span className="text-white font-medium text-xs">{w.utilization}%</span>
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
