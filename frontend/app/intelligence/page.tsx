'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Sparkles, ArrowRight } from 'lucide-react';

interface IntelligenceFeature {
  slug: string;
  title: string;
  description: string;
  capabilities: string[];
  phase: string;
  color: string;
}

const features: IntelligenceFeature[] = [
  {
    slug: 'health',
    title: 'Inventory Health',
    description: 'AI-driven analysis of your inventory health across all warehouses, identifying risks before they become problems.',
    capabilities: ['Health score per product', 'Risk segmentation', 'Aging stock detection', 'Demand signal analysis'],
    phase: 'Phase 2',
    color: 'var(--success)',
  },
  {
    slug: 'predictive',
    title: 'Predictive Radar',
    description: 'Machine learning forecasts for demand, replenishment timing and potential stockout prediction.',
    capabilities: ['Demand forecasting', 'Replenishment recommendations', 'Seasonal pattern detection', 'Supplier lead time modeling'],
    phase: 'Phase 2',
    color: 'var(--primary)',
  },
  {
    slug: 'copilot',
    title: 'AI Copilot',
    description: 'A conversational AI assistant that lets you query your inventory data using natural language.',
    capabilities: ['Natural language queries', 'Instant stock analysis', 'Operational recommendations', 'Report generation via chat'],
    phase: 'Phase 3',
    color: 'var(--info)',
  },
  {
    slug: 'anomalies',
    title: 'Anomaly Detection',
    description: 'Real-time detection of unusual inventory patterns, potential shrinkage and data integrity issues.',
    capabilities: ['Unexpected stock changes', 'Location discrepancies', 'Movement anomalies', 'Cycle count variance'],
    phase: 'Phase 2',
    color: 'var(--warning)',
  },
  {
    slug: 'simulator',
    title: 'Inventory Simulator',
    description: 'Simulate demand scenarios and evaluate their impact on stock levels across the warehouse network.',
    capabilities: ['Scenario modeling', 'What-if analysis', 'Safety stock optimization', 'Network rebalancing simulation'],
    phase: 'Phase 3',
    color: 'var(--danger)',
  },
];

function IntelligenceCard({ feature, onLearn }: { feature: IntelligenceFeature; onLearn: () => void }) {
  return (
    <div className="fs-surface p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${feature.color} 12%, transparent)` }}>
          <Sparkles className="h-5 w-5" style={{ color: feature.color }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'var(--surface-muted)', color: 'var(--text-muted)' }}>
          {feature.phase}
        </span>
      </div>
      <div>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{feature.title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feature.description}</p>
      </div>
      <div className="space-y-1.5">
        {feature.capabilities.map(cap => (
          <div key={cap} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: feature.color }} />
            {cap}
          </div>
        ))}
      </div>
      <button
        onClick={onLearn}
        className="mt-auto flex items-center gap-2 text-sm font-medium transition-colors"
        style={{ color: feature.color }}
      >
        Learn more <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function IntelligencePage() {
  const router = useRouter();
  return (
    <AppShell title="Intelligence">
      <div className="fs-page-inner space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto py-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-4" style={{ background: 'var(--primary-soft)' }}>
            <Sparkles className="h-7 w-7" style={{ color: 'var(--primary)' }} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>
            Autonomous Intelligence
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            FineStock&apos;s AI features extend the platform from an inventory system to a true intelligence platform. These capabilities are being built on top of the Phase 1 ledger foundation.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--warning)' }} />
            Coming in Phase 2 & 3
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(f => (
            <IntelligenceCard key={f.slug} feature={f} onLearn={() => router.push(`/intelligence/${f.slug}`)} />
          ))}
        </div>

        {/* Phase 1 note */}
        <div className="fs-surface p-6 text-center">
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Why Phase 1 First?</p>
          <p className="text-sm max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            AI features require a trusted data foundation. FineStock Phase 1 builds that foundation — the immutable ledger, real-time stock positions, and operation traceability. Without clean data, AI predictions are meaningless.
          </p>
          <button className="fs-btn-primary mt-4" onClick={() => router.push('/ledger')}>Explore the Ledger Foundation</button>
        </div>
      </div>
    </AppShell>
  );
}
