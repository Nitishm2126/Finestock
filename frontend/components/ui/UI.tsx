'use client';

import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusMap: Record<string, { variant: string; dot?: string }> = {
  // Inventory Risk
  Healthy: { variant: 'fs-badge-success' },
  'Low Stock': { variant: 'fs-badge-warning' },
  Critical: { variant: 'fs-badge-danger' },
  'Out of Stock': { variant: 'fs-badge-danger' },
  // Operations & Generic
  COMPLETED: { variant: 'fs-badge-success' },
  Completed: { variant: 'fs-badge-success' },
  DONE: { variant: 'fs-badge-success' },
  Done: { variant: 'fs-badge-success' },
  DELIVERED: { variant: 'fs-badge-success' },
  Delivered: { variant: 'fs-badge-success' },
  PENDING: { variant: 'fs-badge-warning' },
  Pending: { variant: 'fs-badge-warning' },
  WAITING: { variant: 'fs-badge-warning' },
  Waiting: { variant: 'fs-badge-warning' },
  PARTIAL: { variant: 'fs-badge-warning' },
  Partial: { variant: 'fs-badge-warning' },
  PENDING_APPROVAL: { variant: 'fs-badge-warning' },
  REQUESTED: { variant: 'fs-badge-warning' },
  PROCESSING: { variant: 'fs-badge-info' },
  Processing: { variant: 'fs-badge-info' },
  'In Transit': { variant: 'fs-badge-info' },
  IN_TRANSIT: { variant: 'fs-badge-info' },
  PICKING: { variant: 'fs-badge-info' },
  PICKED: { variant: 'fs-badge-primary' },
  PACKING: { variant: 'fs-badge-info' },
  PACKED: { variant: 'fs-badge-primary' },
  READY: { variant: 'fs-badge-success' },
  DRAFT: { variant: 'fs-badge-neutral' },
  Draft: { variant: 'fs-badge-neutral' },
  CANCELLED: { variant: 'fs-badge-neutral' },
  Cancelled: { variant: 'fs-badge-neutral' },
  REJECTED: { variant: 'fs-badge-danger' },
  APPROVED: { variant: 'fs-badge-primary' },
  // Alerts
  INFO: { variant: 'fs-badge-info' },
  WARNING: { variant: 'fs-badge-warning' },
  CRITICAL: { variant: 'fs-badge-danger' },
  // Warehouses
  Active: { variant: 'fs-badge-success' },
  Inactive: { variant: 'fs-badge-neutral' },
  Attention: { variant: 'fs-badge-warning' },
  // Ledger
  RECEIPT: { variant: 'fs-badge-success' },
  RECEIPT_IN: { variant: 'fs-badge-success' },
  DELIVERY: { variant: 'fs-badge-info' },
  DELIVERY_OUT: { variant: 'fs-badge-info' },
  TRANSFER_IN: { variant: 'fs-badge-primary' },
  TRANSFER_OUT: { variant: 'fs-badge-primary' },
  ADJUSTMENT: { variant: 'fs-badge-warning' },
  ADJUSTMENT_IN: { variant: 'fs-badge-warning' },
  ADJUSTMENT_OUT: { variant: 'fs-badge-warning' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusMap[status] || { variant: 'fs-badge-neutral' };
  return (
    <span className={`fs-badge ${config.variant}`} style={size === 'sm' ? { fontSize: '10px', padding: '2px 8px' } : {}}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
}

const colorMap: Record<string, string> = {
  default: 'var(--text-primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
  primary: 'var(--primary)',
};

export function MetricCard({ label, value, subValue, color = 'default', icon, trend }: MetricCardProps) {
  return (
    <div className="fs-metric-card">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        {icon && <div className="opacity-60">{icon}</div>}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold tracking-tight" style={{ color: colorMap[color] ?? colorMap.default }}>
            {value}
          </p>
          {subValue && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subValue}</p>}
        </div>
        {trend && (
          <span className="text-xs font-semibold" style={{ color: trend.positive ? 'var(--success)' : 'var(--danger)' }}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

export function SkeletonLine({ width = '100%', height = 16 }: { width?: string | number; height?: number }) {
  return <div className="fs-skeleton" style={{ width, height, borderRadius: 4 }} />;
}

export function SkeletonCard() {
  return (
    <div className="fs-metric-card space-y-3">
      <SkeletonLine width="40%" height={12} />
      <SkeletonLine width="60%" height={28} />
      <SkeletonLine width="50%" height={10} />
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {icon && <div className="mb-4 opacity-40" style={{ color: 'var(--text-muted)' }}>{icon}</div>}
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {description && <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
