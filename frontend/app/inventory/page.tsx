'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';
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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Inventory Positions</h2>
            <p className="text-sm text-slate-400">Current stock levels</p>
          </div>
        </div>

        {error && <div className="text-red-400 bg-red-400/10 p-3 rounded">{error}</div>}

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Physical</th>
                <th className="px-6 py-4 text-right">Reserved</th>
                <th className="px-6 py-4 text-right">Available</th>
                <th className="px-6 py-4 text-center">Status</th>
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
                  <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{p.product_name}</div>
                      <div className="text-xs font-mono text-slate-500">{p.sku}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300">{p.warehouse_name}</div>
                      <div className="text-xs text-slate-500">{p.location_name}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white">{p.quantity}</td>
                    <td className="px-6 py-4 text-right text-orange-400">{p.reserved_quantity}</td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-400">{p.available_quantity}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        p.available_quantity > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
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
