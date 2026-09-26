'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import {
  ShieldCheck,
  UserCheck,
  Building2,
  Mail,
  Shield,
  LogOut,
  RefreshCw,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout, refreshProfile } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-sm text-slate-400">Verifying authenticated session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppShell title="Authenticated Dashboard" activeItem="Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-xl">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Authenticated Session Active
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user.first_name} {user.last_name}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              You are signed in as an administrator on the Fine Stock Autonomous Inventory Platform.
              Your identity has been verified via cryptographically signed JWT.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => refreshProfile()}
                className="flex items-center gap-2 rounded-lg bg-slate-800 px-3.5 py-2 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                <span>Verify Token Profile</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3.5 py-2 border border-red-500/30 text-xs font-medium text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-red-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
        </div>

        {/* Authenticated Identity Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/30">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Authenticated Profile</h3>
                  <p className="text-xs text-slate-400">Verified identity from PostgreSQL</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                Active
              </span>
            </div>

            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1">
                <dt className="text-slate-400 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-500" /> Email
                </dt>
                <dd className="font-medium text-slate-200">{user.email}</dd>
              </div>

              <div className="flex items-center justify-between py-1">
                <dt className="text-slate-400 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-slate-500" /> Role
                </dt>
                <dd className="rounded bg-slate-800 px-2 py-0.5 font-semibold text-emerald-400 border border-slate-700">
                  {user.role}
                </dd>
              </div>

              <div className="flex items-center justify-between py-1">
                <dt className="text-slate-400 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" /> Organization ID
                </dt>
                <dd className="font-mono text-[11px] text-slate-400 truncate max-w-[200px]" title={user.organization_id}>
                  {user.organization_id}
                </dd>
              </div>

              <div className="flex items-center justify-between py-1">
                <dt className="text-slate-400 flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-slate-500" /> User UUID
                </dt>
                <dd className="font-mono text-[11px] text-slate-400 truncate max-w-[200px]" title={user.id}>
                  {user.id}
                </dd>
              </div>
            </dl>
          </div>

          {/* Security Architecture Principle */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div className="rounded-lg bg-teal-500/10 p-2 text-teal-400 border border-teal-500/30">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Security Architecture</h3>
                  <p className="text-xs text-slate-400">Stateless JWT + Bcrypt protection</p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-400 leading-relaxed">
                <p>
                  &bull; <strong>Password Protection:</strong> Passwords hashed with salted bcrypt rounds prior to database persistence.
                </p>
                <p>
                  &bull; <strong>Authorization Gate:</strong> Subsequent inventory mutations (Receipts, Deliveries, Adjustments) strictly require valid organization-scoped tokens.
                </p>
                <p>
                  &bull; <strong>Ledger Rule:</strong> &ldquo;The ledger is truth, everything else is a view.&rdquo;
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-slate-950/60 border border-slate-800 p-3 flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Phase 1 Prompt 4 complete. Ready for Role-Based Access Controls (RBAC).</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
