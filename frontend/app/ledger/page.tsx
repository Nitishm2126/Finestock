'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { MetricCard } from '@/components/ui/UI';
import { Drawer } from '@/components/ui/Overlay';
import { useToast } from '@/lib/ui/ToastProvider';
import { BookOpenText, Search, Download, Lock, ShieldCheck } from 'lucide-react';
import { fetchLedger, LedgerEntry } from '@/services/ledger.service';

const TYPES_COLOR: Record<string, string> = {
  RECEIPT: 'fs-badge-success',
  DELIVERY: 'fs-badge-info',
  TRANSFER_IN: 'fs-badge-primary',
  TRANSFER_OUT: 'fs-badge-primary',
  ADJUSTMENT_IN: 'fs-badge-warning',
  ADJUSTMENT_OUT: 'fs-badge-warning',
};

export default function LedgerPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLedger(token!);
      setEntries(data);
    } catch {
      toast.error('Unable to load ledger', 'Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated, loadData]);

  const filtered = entries.filter(e => {
    const matchSearch = !searchQuery || e.product.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase()) || e.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'All' || e.type === typeFilter;
    return matchSearch && matchType;
  });

  const exportCSV = () => {
    const rows = [['Event ID', 'Timestamp', 'Product', 'SKU', 'Type', 'Quantity', 'Before', 'After', 'Warehouse', 'Location', 'Performed By']];
    filtered.forEach(e => rows.push([e.id, e.timestamp, e.product, e.sku, e.type, String(e.quantity), String(e.before), String(e.after), e.warehouse, e.location, e.performed_by]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ledger.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete', 'ledger.csv downloaded.');
  };

  if (authLoading) return null;

  const totalIn = entries.filter(e => e.quantity > 0).reduce((a, e) => a + e.quantity, 0);
  const totalOut = entries.filter(e => e.quantity < 0).reduce((a, e) => a + Math.abs(e.quantity), 0);
  const todayCount = entries.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString()).length;
  const TYPES = ['All', 'RECEIPT', 'DELIVERY', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT'];

  return (
    <AppShell title="Ledger">
      <div className="fs-page-inner space-y-6">

        {/* Header */}
        <div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Operations / Ledger</p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inventory Ledger</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Immutable record of every stock-changing event.</p>
            </div>
            <button className="fs-btn-secondary" onClick={exportCSV}><Download className="h-4 w-4" /> Export</button>
          </div>
        </div>

        {/* Immutable statement */}
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary)' }}>
          <ShieldCheck className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>Every stock movement is traceable.</p>
            <p className="text-xs" style={{ color: 'var(--primary)' }}>This is an append-only, immutable record. Entries cannot be edited or deleted.</p>
          </div>
          <span className="ml-auto flex-shrink-0 fs-badge fs-badge-primary"><Lock className="h-3 w-3 mr-1" />IMMUTABLE</span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard label="Total Events" value={entries.length} icon={<BookOpenText className="h-4 w-4" />} />
          <MetricCard label="Stock In" value={totalIn.toLocaleString()} color="success" />
          <MetricCard label="Stock Out" value={totalOut.toLocaleString()} color="warning" />
          <MetricCard label="Transfers" value={entries.filter(e => e.type.startsWith('TRANSFER')).length} color="primary" />
          <MetricCard label="Today&apos;s Events" value={todayCount} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search by product, SKU or event ID…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="fs-input pl-9" />
          </div>
          <div className="flex flex-wrap gap-1">
            {TYPES.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: typeFilter === t ? 'var(--primary)' : 'var(--surface)',
                  color: typeFilter === t ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${typeFilter === t ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                {t === 'All' ? 'All Types' : t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="fs-surface overflow-hidden">
          {loading ? (
            <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>Loading ledger…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>No ledger entries match your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="fs-table">
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Timestamp</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Before</th>
                    <th className="text-right">After</th>
                    <th>Warehouse / Location</th>
                    <th>Performed By</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td>
                        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>{e.id}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{new Date(e.timestamp).toLocaleString()}</td>
                      <td>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{e.product}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{e.sku}</p>
                      </td>
                      <td>
                        <span className={`fs-badge ${TYPES_COLOR[e.type] || 'fs-badge-neutral'}`}>
                          {e.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-right font-semibold" style={{ color: e.quantity > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {e.quantity > 0 ? '+' : ''}{e.quantity}
                      </td>
                      <td className="text-right" style={{ color: 'var(--text-secondary)' }}>{e.before}</td>
                      <td className="text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{e.after}</td>
                      <td>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{e.warehouse}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.location}</p>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{e.performed_by}</td>
                      <td>
                        {/* IMMUTABLE: View Details ONLY — No edit/delete */}
                        <button
                          className="fs-btn-secondary"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => { setSelected(e); setDrawerOpen(true); }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Immutable footer note */}
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Lock className="h-3.5 w-3.5" />
          <span>Ledger records are immutable and append-only. No entries can be edited or deleted.</span>
        </div>
      </div>

      {/* Event Detail Drawer — View Only */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={`Event ${selected?.id || ''}`} subtitle="Immutable ledger event" width={540}>
        {selected && (
          <div className="space-y-4">
            {/* Immutable badge */}
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--primary-soft)' }}>
              <Lock className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>IMMUTABLE EVENT — Append-Only Record</span>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Event ID', value: selected.id },
                { label: 'Timestamp', value: new Date(selected.timestamp).toLocaleString() },
                { label: 'Product', value: selected.product },
                { label: 'SKU', value: selected.sku },
                { label: 'Event Type', value: selected.type },
                { label: 'Quantity Change', value: `${selected.quantity > 0 ? '+' : ''}${selected.quantity}` },
                { label: 'Stock Before', value: selected.before },
                { label: 'Stock After', value: selected.after },
                { label: 'Warehouse', value: selected.warehouse },
                { label: 'Location', value: selected.location },
                { label: 'Performed By', value: selected.performed_by },
                { label: 'Reference', value: selected.reference || '—' },
              ].map(f => (
                <div key={f.label} className="p-3 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{f.value}</p>
                </div>
              ))}
            </div>

            {/* Link to operation */}
            {selected.operation_id && (
              <button
                className="fs-btn-secondary w-full"
                onClick={() => { setDrawerOpen(false); router.push('/operations'); }}
              >
                View Source Operation: {selected.operation_id}
              </button>
            )}

            {/* Explicit: No edit / delete */}
            <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--surface-muted)', color: 'var(--text-muted)', textAlign: 'center' }}>
              <Lock className="inline h-3.5 w-3.5 mr-1" />
              This record is immutable. Edit and delete actions are not available.
            </div>
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}
