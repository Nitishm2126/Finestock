'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Plus, Loader2, Package, Search, Filter, Upload } from 'lucide-react';
import { fetchProducts, Product } from '@/services/product.service';

export default function ProductsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
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
        const data = await fetchProducts(token);
        setProducts(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated) loadData();
  }, [isAuthenticated, token]);

  if (authLoading || (loading && !products.length)) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
    </div>
  );

  return (
    <AppShell title="Products" activeItem="Products">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-xl">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Package className="w-64 h-64 -mt-10 -mr-10 text-emerald-500" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Product Catalog</h2>
              <p className="text-sm text-slate-400 mt-1 max-w-xl">Manage SKUs, stock thresholds and product intelligence.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-lg font-medium transition-colors border border-slate-700">
                <Upload className="h-4 w-4" /> Import
              </button>
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20">
                <Plus className="h-4 w-4" /> Add Product
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by product name or SKU..." 
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>
          <button className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 border border-slate-800 bg-slate-900/60 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
            <Filter className="h-4 w-4" /> Advanced Filters
          </button>
        </div>

        {error && <div className="text-red-400 bg-red-400/5 border border-red-400/20 p-4 rounded-lg text-sm text-center">{error}</div>}

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr className="bg-slate-950/80">
                <th className="px-6 py-4 font-semibold tracking-wider">SKU</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Name</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Category</th>
                <th className="px-6 py-4 font-semibold tracking-wider">UOM</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Current Stock</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Reorder Point</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No products found. Add your first product to get started.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-mono text-emerald-400 text-xs">{p.sku}</td>
                    <td className="px-6 py-4 font-medium text-white group-hover:text-emerald-400 transition-colors">{p.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300 ring-1 ring-inset ring-slate-700/50">
                        {p.category?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{p.uom?.name || 'N/A'}</td>
                    <td className={`px-6 py-4 font-semibold text-right ${p.current_stock! <= p.reorder_point ? 'text-amber-400' : 'text-white'}`}>{p.current_stock ?? 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-500 text-right">{p.reorder_point}</td>
                    <td className="px-6 py-4 text-center">
                      {p.status ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                          p.status === 'Low Stock' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${p.status === 'Critical' ? 'bg-red-500' : p.status === 'Low Stock' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          {p.status}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
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
