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
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { fetchDashboardSummary, DashboardSummary } from '@/services/dashboard.service';

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="space-y-6">
        
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-xl">
          <div className="relative z-10 max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user.first_name} {user.last_name}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
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

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex items-center gap-4">
              <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Products</p>
                <h3 className="text-2xl font-bold text-white">{summary.total_products}</h3>
                <p className="text-xs text-slate-500">{summary.active_products} active</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3 text-blue-400">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Warehouses</p>
                <h3 className="text-2xl font-bold text-white">{summary.total_warehouses}</h3>
                <p className="text-xs text-slate-500">{summary.total_locations} locations</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex items-center gap-4">
              <div className="rounded-lg bg-orange-500/10 p-3 text-orange-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Low Stock</p>
                <h3 className="text-2xl font-bold text-white">{summary.low_stock_products}</h3>
                <p className="text-xs text-slate-500">Products</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex items-center gap-4">
              <div className="rounded-lg bg-red-500/10 p-3 text-red-400">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Out of Stock</p>
                <h3 className="text-2xl font-bold text-white">{summary.out_of_stock_products}</h3>
                <p className="text-xs text-slate-500">Products</p>
              </div>
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
              <span className="text-sm text-slate-300">API: Online</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
              <span className="text-sm text-slate-300">Database: Connected</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
              <span className="text-sm text-slate-300">Authentication: Active</span>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
