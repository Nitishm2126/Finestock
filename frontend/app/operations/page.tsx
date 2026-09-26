'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { fetchOperations, Operation } from '@/services/operations.service';
import { Loader2, ArrowLeftRight, CheckCircle2, Clock, Plus, Search, Filter, Box } from 'lucide-react';

export default function OperationsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        setLoading(true);
        const data = await fetchOperations(token);
        setOperations(data);
        setError(null);
      } catch {
        setError('Please check the API connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated) loadData();
  }, [isAuthenticated, token]);

  const filteredOps = activeTab === 'All' 
    ? operations 
    : operations.filter(o => o.type === activeTab.toUpperCase().replace(/S$/, ''));

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'RECEIPT': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'DELIVERY': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'TRANSFER': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'ADJUSTMENT': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'COMPLETED': return 'text-emerald-400';
      case 'PENDING': return 'text-amber-400';
      case 'PROCESSING': return 'text-blue-400';
      case 'DRAFT': return 'text-slate-400';
      case 'CANCELLED': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <AppShell title="Operations" activeItem="Operations">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Operations Workspace</h2>
            <p className="text-sm text-slate-400 mt-1">Manage and track all inventory movements and workflows.</p>
          </div>
          <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20">
            <Plus className="h-4 w-4" /> Create Operation
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Total Operations</div>
            <div className="text-2xl font-bold text-white">1,248</div>
            <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
              <ArrowLeftRight className="h-3 w-3" /> +12 today
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Pending Operations</div>
            <div className="text-2xl font-bold text-white">14</div>
            <div className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Action required
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Completed Today</div>
            <div className="text-2xl font-bold text-white">42</div>
            <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> 100% success rate
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Active Transfers</div>
            <div className="text-2xl font-bold text-white">8</div>
            <div className="text-xs text-blue-400 mt-2 flex items-center gap-1">
              <Box className="h-3 w-3" /> In transit
            </div>
          </div>
        </div>

        {/* Workspace Toolbar */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
              {['All', 'Receipts', 'Deliveries', 'Transfers', 'Adjustments'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab 
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search & Filter */}
            <div className="flex gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search operations..." 
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 w-full lg:w-64"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border border-slate-800 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/50">
                <Filter className="h-4 w-4" /> Filters
              </button>
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          {error && <div className="p-8 text-center text-red-400 bg-red-400/5">{error}</div>}
          
          {!error && loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
              <p className="text-slate-400">Loading operations...</p>
            </div>
          ) : !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/50 text-xs uppercase text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Operation ID</th>
                    <th className="px-6 py-4 font-semibold">Type</th>
                    <th className="px-6 py-4 font-semibold">Product</th>
                    <th className="px-6 py-4 font-semibold text-right">Quantity</th>
                    <th className="px-6 py-4 font-semibold">Route</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredOps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        <Box className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                        <p>No operations found matching your criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredOps.map((op) => (
                      <tr key={op.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-emerald-400 font-medium">{op.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border ${getTypeColor(op.type)}`}>
                            {op.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{op.product}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">{op.warehouse}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-white whitespace-nowrap">
                          {op.quantity} units
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 max-w-[100px] truncate" title={op.source}>{op.source}</span>
                            <ArrowLeftRight className="h-3 w-3 text-slate-600" />
                            <span className="text-slate-300 font-medium max-w-[100px] truncate" title={op.destination}>{op.destination}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${getStatusColor(op.status)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(op.status).replace('text-', 'bg-')}`} />
                            {op.status}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-slate-300">{new Date(op.date).toLocaleDateString()}</div>
                          <div className="text-xs text-slate-500">{new Date(op.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
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
