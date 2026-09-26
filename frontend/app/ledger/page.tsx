'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { fetchLedger, LedgerEntry } from '@/services/ledger.service';
import { Loader2, ShieldCheck, Database, Search, Filter, Activity, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';

export default function LedgerPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
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
        const data = await fetchLedger(token);
        setEntries(data);
        setError(null);
      } catch {
        setError('Please check the API connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated) loadData();
  }, [isAuthenticated, token]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    if (type.includes('IN') || type === 'RECEIPT') return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    if (type.includes('OUT') || type === 'DELIVERY') return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <RefreshCcw className="h-4 w-4 text-blue-400" />;
  };

  const getTypeColor = (type: string) => {
    if (type.includes('IN') || type === 'RECEIPT') return 'text-emerald-400';
    if (type.includes('OUT') || type === 'DELIVERY') return 'text-red-400';
    return 'text-blue-400';
  };

  return (
    <AppShell title="Immutable Ledger" activeItem="Ledger">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-xl">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Database className="w-64 h-64 -mt-10 -mr-10 text-emerald-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-white tracking-tight">Inventory Ledger</h2>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              The ledger represents the immutable, append-only history of all inventory movements. 
              Records cannot be altered or deleted, ensuring complete auditability.
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-xs text-slate-500 mb-1">Total Entries</div>
            <div className="text-xl font-bold text-white">8,492</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-xs text-slate-500 mb-1">Stock In (30d)</div>
            <div className="text-xl font-bold text-emerald-400">+12,450</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-xs text-slate-500 mb-1">Stock Out (30d)</div>
            <div className="text-xl font-bold text-red-400">-9,230</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-xs text-slate-500 mb-1">Transfers</div>
            <div className="text-xl font-bold text-blue-400">1,420</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-xs text-slate-500 mb-1">Adjustments</div>
            <div className="text-xl font-bold text-amber-400">142</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-xs text-slate-500 mb-1">Today&apos;s Events</div>
            <div className="text-xl font-bold text-white">24</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by Event ID, Product, or SKU..." 
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>
          <button className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 border border-slate-800 bg-slate-900/60 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
            <Filter className="h-4 w-4" /> Advanced Filters
          </button>
        </div>

        {/* Ledger Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          {error && <div className="p-8 text-center text-red-400 bg-red-400/5">{error}</div>}
          
          {!error && loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
              <p className="text-slate-400">Loading immutable ledger...</p>
            </div>
          ) : !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Event ID / Time</th>
                    <th className="px-5 py-4 font-semibold">Operation</th>
                    <th className="px-5 py-4 font-semibold">Product & Location</th>
                    <th className="px-5 py-4 font-semibold text-right">Qty</th>
                    <th className="px-5 py-4 font-semibold text-right">Balance</th>
                    <th className="px-5 py-4 font-semibold">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center font-sans text-slate-500">
                        <Activity className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                        <p>No ledger events found.</p>
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors cursor-pointer group">
                        <td className="px-5 py-3">
                          <div className="text-emerald-400 font-medium text-xs mb-1">{entry.id}</div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {new Date(entry.timestamp).toLocaleString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric', 
                              hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            {getTypeIcon(entry.type)}
                            <span className={`text-[11px] font-bold tracking-wider ${getTypeColor(entry.type)}`}>
                              {entry.type}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">{entry.operation_id}</div>
                        </td>
                        <td className="px-5 py-3 font-sans">
                          <div className="font-medium text-slate-200 text-sm truncate max-w-[200px]">{entry.product}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{entry.sku} | {entry.location}</div>
                        </td>
                        <td className={`px-5 py-3 text-right font-medium text-sm ${entry.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                        </td>
                        <td className="px-5 py-3 text-right text-sm">
                          <div className="flex flex-col items-end">
                            <span className="text-slate-200 font-medium">{entry.after}</span>
                            <span className="text-[10px] text-slate-500 border-t border-slate-700 pt-0.5 mt-0.5 inline-block min-w-[30px]">
                              prev: {entry.before}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-sans">
                          <div className="text-sm text-slate-300">{entry.performed_by}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[150px]" title={entry.reason}>{entry.reason}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
