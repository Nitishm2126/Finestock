'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2, Boxes, Search, Filter, Download } from 'lucide-react';
import { fetchInventory, StockPosition } from '@/services/inventory.service';

export default function InventoryPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [positions, setPositions] = useState<StockPosition[]>([]);
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
        const data = await fetchInventory(token);
        setPositions(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated) loadData();
  }, [isAuthenticated, token]);

  if (authLoading || (loading && !positions.length)) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
    </div>
  );

  return (
    <AppShell title="Inventory" activeItem="Inventory">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-xl">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Boxes className="w-64 h-64 -mt-10 -mr-10 text-emerald-500" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Inventory</h2>
              <p className="text-sm text-slate-400 mt-1 max-w-xl">Real-time stock visibility across every warehouse and location.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-lg font-medium transition-colors border border-slate-700">
                <Download className="h-4 w-4" /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Physical Stock</div>
            <div className="text-xl font-bold text-white">{positions.reduce((acc, p) => acc + p.quantity, 0).toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Reserved Stock</div>
            <div className="text-xl font-bold text-amber-400">{positions.reduce((acc, p) => acc + p.reserved_quantity, 0).toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Available Stock</div>
            <div className="text-xl font-bold text-emerald-400">{positions.reduce((acc, p) => acc + p.available_quantity, 0).toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Low Stock</div>
            <div className="text-xl font-bold text-orange-400">12</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Out of Stock</div>
            <div className="text-xl font-bold text-red-400">3</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by product, SKU or location..." 
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 border border-slate-800 bg-slate-900/60 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              <Filter className="h-4 w-4" /> Filters
            </button>
          </div>
        </div>

        {error && <div className="text-red-400 bg-red-400/5 border border-red-400/20 p-4 rounded-lg text-sm text-center">{error}</div>}

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Product</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Location</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Physical</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Reserved</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Available</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No inventory found.
                  </td>
                </tr>
              ) : (
                positions.map((p, idx) => (
                  <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white group-hover:text-emerald-400 transition-colors">{p.product_name}</div>
                      <div className="text-xs font-mono text-emerald-400/70">{p.sku}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300 font-medium">{p.warehouse_name}</div>
                      <div className="text-xs text-slate-500">{p.location_name}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white">{p.quantity}</td>
                    <td className="px-6 py-4 text-right text-amber-400">{p.reserved_quantity}</td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-400">{p.available_quantity}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.available_quantity > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${p.available_quantity > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {p.available_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
