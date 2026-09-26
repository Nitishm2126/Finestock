import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  ShieldCheck,
  Server,
  Database,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function HomePage() {
  return (
    <AppShell title="Platform Overview">
      <div className="space-y-6">
        {/* Welcome / Foundation Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-xl">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Phase 1 — System Foundation &amp; Supabase Integration
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Fine Stock
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              Autonomous Inventory Intelligence Platform. Engineered for absolute stock integrity,
              predictive replenishment, and autonomous supply chain operations.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-2 border border-slate-700 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Frontend Shell Ready</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-2 border border-slate-700 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>FastAPI Backend Online</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-2 border border-slate-700 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>PostgreSQL Schema Migrated</span>
              </div>
            </div>
          </div>

          {/* Background decorative element */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
        </div>

        {/* Core Architecture Principle Card */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-5 sm:p-6 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                Architectural Core Principle
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                &ldquo;The ledger is truth, everything else is a view.&rdquo;
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Fine Stock enforces immutable double-entry stock transactions at the ledger layer.
                Stock positions, valuations, and intelligence models are derived views strictly
                calculated from authoritative journal entries.
              </p>
            </div>
          </div>
        </div>

        {/* Foundation Status Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Frontend App Shell */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-slate-800 p-2 text-slate-200">
                <Layers className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                Active
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white">Next.js App Shell</h4>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Responsive App Router layout, TypeScript, Tailwind styling, and modern UI tokens.
            </p>
          </div>

          {/* Card 2: FastAPI Backend */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-slate-800 p-2 text-slate-200">
                <Server className="h-5 w-5 text-teal-400" />
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                Running
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white">FastAPI Backend</h4>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Python 3.12, Uvicorn, Pydantic v2, CORS, and modular router architecture.
            </p>
          </div>

          {/* Card 3: PostgreSQL Database Schema */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-slate-800 p-2 text-slate-200">
                <Database className="h-5 w-5 text-cyan-400" />
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                Migrated
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white">PostgreSQL + Alembic</h4>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              All 9 Phase 1 tables, foreign keys, check constraints, and indexes applied.
            </p>
          </div>

          {/* Card 4: Ledger & Intelligence Engine */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-slate-800 p-2 text-slate-200">
                <Cpu className="h-5 w-5 text-indigo-400" />
              </div>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                Phase 3-5
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white">Stock Ledger Core</h4>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Immutable journal lines, balance projections, and autonomous inventory scoring.
            </p>
          </div>
        </div>

        {/* Phase Implementation Roadmap */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-white">Implementation Roadmap</h3>
              <p className="text-xs text-slate-400">Current progress according to the 10-Phase Master Plan</p>
            </div>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Phase 1 Underway
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white">Prompt 1: Project Foundation</div>
                <div className="text-[11px] text-slate-400">Next.js + App Shell + Visual Styling</div>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white">Prompt 2: Backend Pivot &amp; Setup</div>
                <div className="text-[11px] text-slate-400">Python 3.12, FastAPI, SQLAlchemy 2</div>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white">Prompt 3: Database Schema</div>
                <div className="text-[11px] text-slate-400">9 PostgreSQL Tables, Alembic Migrations, Check Constraints</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
