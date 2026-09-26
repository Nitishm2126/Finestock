'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Sparkles, ArrowLeft, Lock } from 'lucide-react';

const FEATURE_DATA: Record<string, { title: string; description: string; phase: string; details: string }> = {
  health: { title: 'Inventory Health', description: 'AI-driven analysis identifying health risks across your entire inventory.', phase: 'Phase 2', details: 'Uses historical movement data from the immutable ledger to score each product\'s health across dimensions: demand trend, aging, reorder behavior, and accuracy.' },
  predictive: { title: 'Predictive Radar', description: 'Machine learning models to forecast demand and replenishment needs.', phase: 'Phase 2', details: 'Leverages time-series analysis on ledger event data to predict future stock positions and trigger smart replenishment recommendations.' },
  copilot: { title: 'AI Copilot', description: 'Conversational AI assistant for natural language inventory queries.', phase: 'Phase 3', details: 'A fine-tuned language model with real-time access to inventory state, enabling natural queries like "What\'s low stock this week in Chennai?"' },
  anomalies: { title: 'Anomaly Detection', description: 'Real-time detection of unusual patterns in stock movements.', phase: 'Phase 2', details: 'Applies statistical process control on ledger events to flag unusual patterns — shrinkage, unexpected adjustments, location discrepancies.' },
  simulator: { title: 'Inventory Simulator', description: 'Model demand scenarios and evaluate their network-wide impact.', phase: 'Phase 3', details: 'A Monte Carlo simulation engine that uses your historical data to test what-if scenarios — demand spikes, supplier delays, warehouse shutdowns.' },
};

export default function IntelligenceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string || '';
  const feature = FEATURE_DATA[slug];

  if (!feature) {
    router.push('/intelligence');
    return null;
  }

  return (
    <AppShell title={feature.title}>
      <div className="fs-page-inner max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => router.push('/intelligence')}
          className="flex items-center gap-2 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Intelligence
        </button>

        <div className="fs-surface p-8 text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mx-auto" style={{ background: 'var(--primary-soft)' }}>
            <Sparkles className="h-8 w-8" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
              {feature.phase}
            </span>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{feature.title}</h1>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>{feature.description}</p>
          </div>

          <div className="p-5 rounded-xl text-left" style={{ background: 'var(--surface-muted)' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>How it works</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{feature.details}</p>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--info-soft)', border: '1px solid var(--info)' }}>
            <Lock className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--info)' }} />
            <p className="text-sm text-left" style={{ color: 'var(--info)' }}>
              This feature is planned for <strong>{feature.phase}</strong>. It will be built on top of the Phase 1 immutable ledger foundation.
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <button className="fs-btn-secondary" onClick={() => router.push('/ledger')}>Explore the Ledger</button>
            <button className="fs-btn-primary" onClick={() => router.push('/dashboard')}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
