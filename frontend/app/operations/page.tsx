'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState } from '@/components/ui/UI';
import { Drawer, Modal } from '@/components/ui/Overlay';
import { useToast } from '@/lib/ui/ToastProvider';
import {
  ArrowLeftRight, Plus, Search, Download, CheckCircle,
  Clock, FileEdit, Package, XCircle, ChevronDown, Filter
} from 'lucide-react';
import { demoGetOperations, demoCreateOperation, demoUpdateOperation } from '@/lib/demo/store';
import { fetchOperations } from '@/services/operations.service';
import { DEMO_PRODUCTS, DEMO_WAREHOUSES, DEMO_LOCATIONS } from '@/lib/demo/data';

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Operation = any;

const OP_TYPES = ['RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT'];
const TABS = ['All', 'RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT'];
const STATUSES = ['All', 'DRAFT', 'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

function OperationTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    RECEIPT: 'fs-badge-success',
    DELIVERY: 'fs-badge-info',
    TRANSFER: 'fs-badge-primary',
    ADJUSTMENT: 'fs-badge-warning',
  };
  return <span className={`fs-badge ${map[type] || 'fs-badge-neutral'}`}>{type}</span>;
}

export default function OperationsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Operation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [form, setForm] = useState({ type: 'RECEIPT', product: '', quantity: 1, source: '', destination: '', warehouse: '', reference: '', notes: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemo) {
        setOperations(demoGetOperations());
      } else {
        const data = await fetchOperations(token!);
        setOperations(data);
      }
    } catch {
      toast.error('Unable to load operations', 'Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated, loadData]);

  const filtered = operations.filter(o => {
    const matchTab = activeTab === 'All' || o.type === activeTab;
    const matchStatus = statusFilter === 'All' || o.status === statusFilter;
    const matchSearch = !searchQuery || o.id.toLowerCase().includes(searchQuery.toLowerCase()) || o.product.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchStatus && matchSearch;
  });

  const handleCreate = async () => {
    if (!form.product) { toast.warning('Product is required'); return; }
    setFormLoading(true);
    try {
      if (isDemo) {
        demoCreateOperation({ ...form });
        toast.success('Operation created', `${form.type} operation saved as draft.`);
        setCreateOpen(false);
        setForm({ type: 'RECEIPT', product: '', quantity: 1, source: '', destination: '', warehouse: '', reference: '', notes: '' });
        loadData();
      }
    } catch {
      toast.error('Failed to create operation');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = (op: Operation, newStatus: string) => {
    if (op.status === 'COMPLETED' && newStatus !== 'CANCELLED') {
      toast.warning('Cannot change completed operations');
      return;
    }
    if (op.status === 'CANCELLED') {
      toast.warning('Cannot change cancelled operations');
      return;
    }
    if (isDemo) {
      demoUpdateOperation(op.id, newStatus);
      toast.success(`Operation ${newStatus.toLowerCase()}`, `${op.id} status updated.`);
      if (drawerOpen) {
        setSelected({ ...op, status: newStatus });
      }
      loadData();
    }
  };

  const exportCSV = () => {
    const rows = [['ID', 'Type', 'Product', 'Quantity', 'Source', 'Destination', 'Warehouse', 'Created By', 'Date', 'Status']];
    filtered.forEach(o => rows.push([o.id, o.type, o.product, o.quantity, o.source, o.destination, o.warehouse, o.created_by, o.date, o.status]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'operations.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete', 'operations.csv downloaded.');
  };

  if (authLoading) return null;

  const counts = { total: operations.length, receipts: operations.filter(o => o.type === 'RECEIPT').length, deliveries: operations.filter(o => o.type === 'DELIVERY').length, transfers: operations.filter(o => o.type === 'TRANSFER').length, pending: operations.filter(o => o.status === 'PENDING').length, completed: operations.filter(o => o.status === 'COMPLETED').length };

  return (
    <AppShell title="Operations">
      <div className="fs-page-inner space-y-6">

        {/* Header */}
        <div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Operations / Movements</p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Operations</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Manage inventory movements from receipt to delivery.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="fs-btn-secondary" onClick={exportCSV}><Download className="h-4 w-4" /> Export</button>
              <button className="fs-btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Operation</button>
            </div>
          </div>
        </div>

        {/* Dedicated Phase 2 & 3 Workflow Hub */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Receipts', href: '/operations/receipts', desc: 'Inbound Inflow' },
            { label: 'Deliveries', href: '/operations/deliveries', desc: 'Outbound Dispatches' },
            { label: 'Picking', href: '/operations/picking', desc: 'Bin Allocation' },
            { label: 'Packing', href: '/operations/packing', desc: 'Parcel Station' },
            { label: 'Transfers', href: '/operations/transfers', desc: 'Internal Moves' },
            { label: 'Adjustments', href: '/operations/adjustments', desc: 'Cycle Audits' },
            { label: 'History', href: '/operations/history', desc: 'Ledger Audit' },
            { label: 'Live Board', href: '/operations/live', desc: 'Real-time Board' },
          ].map(hub => (
            <button
              key={hub.label}
              onClick={() => router.push(hub.href)}
              className="p-3 rounded-xl border bg-[var(--surface)] text-left hover:border-[var(--primary)] hover:bg-[var(--surface-muted)] transition-all flex flex-col justify-between"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="font-bold text-xs text-[var(--text-primary)]">{hub.label}</span>
              <span className="text-[10px] text-[var(--text-muted)] mt-1">{hub.desc} &rarr;</span>
            </button>
          ))}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <MetricCard label="All Operations" value={counts.total} />
          <MetricCard label="Receipts" value={counts.receipts} color="success" />
          <MetricCard label="Deliveries" value={counts.deliveries} color="info" />
          <MetricCard label="Transfers" value={counts.transfers} color="primary" />
          <MetricCard label="Pending" value={counts.pending} color="warning" />
          <MetricCard label="Completed" value={counts.completed} color="success" />
        </div>

        {/* Type Tabs */}
        <div className="flex gap-1 flex-wrap" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: activeTab === tab ? 'var(--primary)' : 'var(--surface)',
                color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${activeTab === tab ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search by operation ID or product…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="fs-input pl-9" />
          </div>
          <div className="relative">
            <button className="fs-btn-secondary" onClick={() => setFilterOpen(!filterOpen)}>
              <Filter className="h-4 w-4" />
              {statusFilter !== 'All' && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--primary)', color: '#fff' }}>1</span>}
              Status <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {filterOpen && (
              <div className="fs-dropdown" style={{ right: 0, left: 'auto' }}>
                {STATUSES.map(s => (
                  <button key={s} onClick={() => { setStatusFilter(s); setFilterOpen(false); }} className={`flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors ${statusFilter === s ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'}`}>{s}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="fs-surface overflow-hidden">
          {loading ? (
            <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>Loading operations…</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<ArrowLeftRight className="h-10 w-10" />} title="No operations yet" description="Inventory movements will appear here." action={<button className="fs-btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Operation</button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="fs-table">
                <thead>
                  <tr>
                    <th>Operation</th>
                    <th>Type</th>
                    <th>Product</th>
                    <th className="text-right">Qty</th>
                    <th>Source → Destination</th>
                    <th>Created By</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(op => (
                    <tr key={op.id}>
                      <td>
                        <button className="text-left" onClick={() => { setSelected(op); setDrawerOpen(true); }}>
                          <p className="font-mono text-xs font-semibold hover:underline" style={{ color: 'var(--primary)' }}>{op.id}</p>
                        </button>
                      </td>
                      <td><OperationTypeBadge type={op.type} /></td>
                      <td>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{op.product}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{op.warehouse}</p>
                      </td>
                      <td className="text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{op.quantity}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{op.source} → {op.destination}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{op.created_by}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(op.date).toLocaleDateString()}</td>
                      <td><StatusBadge status={op.status} size="sm" /></td>
                      <td>
                        <div className="flex gap-1">
                          <button className="fs-btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => { setSelected(op); setDrawerOpen(true); }}>View</button>
                          {op.status === 'PENDING' && <button className="fs-btn-primary" style={{ padding: '4px 8px', fontSize: 12, background: 'var(--success)' }} onClick={() => handleStatusChange(op, 'COMPLETED')}>Complete</button>}
                          {op.status === 'DRAFT' && <button className="fs-btn-primary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleStatusChange(op, 'PENDING')}>Approve</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Operation Detail Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={`Operation ${selected?.id || ''}`} subtitle={selected?.type} width={540}>
        {selected && (
          <div className="space-y-5">
            {/* Timeline */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>TIMELINE</p>
              <div className="flex items-center gap-3 flex-wrap">
                {['DRAFT', 'PENDING', 'PROCESSING', 'COMPLETED'].map((step, i) => {
                  const statuses = ['DRAFT', 'PENDING', 'PROCESSING', 'COMPLETED'];
                  const currentIdx = statuses.indexOf(selected.status);
                  const stepIdx = i;
                  const done = stepIdx <= currentIdx;
                  return (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-1">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: done ? 'var(--primary)' : 'var(--border)', color: done ? '#fff' : 'var(--text-muted)' }}>
                          {done ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        </div>
                        <span className="text-[10px] font-medium" style={{ color: done ? 'var(--primary)' : 'var(--text-muted)' }}>{step}</span>
                      </div>
                      {i < 3 && <div className="flex-1 h-px" style={{ background: statuses.indexOf(selected.status) > i ? 'var(--primary)' : 'var(--border)' }} />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Type', value: selected.type },
                { label: 'Status', value: selected.status },
                { label: 'Product', value: selected.product },
                { label: 'Quantity', value: selected.quantity },
                { label: 'Source', value: selected.source },
                { label: 'Destination', value: selected.destination },
                { label: 'Warehouse', value: selected.warehouse },
                { label: 'Created By', value: selected.created_by },
                { label: 'Date', value: new Date(selected.date).toLocaleString() },
                { label: 'Reference', value: selected.reference || '—' },
              ].map(f => (
                <div key={f.label} className="p-3 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{f.value}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            {selected.status !== 'COMPLETED' && selected.status !== 'CANCELLED' && (
              <div className="flex flex-wrap gap-2 pt-2">
                {selected.status === 'DRAFT' && (
                  <>
                    <button className="fs-btn-primary" onClick={() => handleStatusChange(selected, 'PENDING')}>Approve</button>
                    <button className="fs-btn-secondary" onClick={() => handleStatusChange(selected, 'CANCELLED')}><XCircle className="h-4 w-4" /> Cancel</button>
                  </>
                )}
                {selected.status === 'PENDING' && (
                  <>
                    <button className="fs-btn-primary" style={{ background: 'var(--success)' }} onClick={() => handleStatusChange(selected, 'COMPLETED')}><CheckCircle className="h-4 w-4" /> Mark Complete</button>
                    <button className="fs-btn-secondary" onClick={() => handleStatusChange(selected, 'CANCELLED')}><XCircle className="h-4 w-4" /> Cancel</button>
                  </>
                )}
                {selected.status === 'PROCESSING' && (
                  <button className="fs-btn-primary" style={{ background: 'var(--success)' }} onClick={() => handleStatusChange(selected, 'COMPLETED')}><CheckCircle className="h-4 w-4" /> Complete</button>
                )}
              </div>
            )}
            {(selected.status === 'COMPLETED' || selected.status === 'CANCELLED') && (
              <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--surface-muted)', color: 'var(--text-muted)' }}>
                This operation is <strong>{selected.status.toLowerCase()}</strong> and cannot be changed.
              </div>
            )}

            <button className="fs-btn-secondary w-full" onClick={() => router.push('/ledger')}>
              <FileEdit className="h-4 w-4" /> View in Ledger
            </button>
          </div>
        )}
      </Drawer>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Operation" subtitle="Record an inventory movement">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Operation Type</label>
            <select className="fs-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {OP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Product *</label>
            <select className="fs-select" value={form.product} onChange={e => setForm({ ...form, product: e.target.value })}>
              <option value="">Select product…</option>
              {DEMO_PRODUCTS.map(p => <option key={p.id} value={p.name}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Quantity *</label>
              <input type="number" min="1" className="fs-input" value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Warehouse</label>
              <select className="fs-select" value={form.warehouse} onChange={e => setForm({ ...form, warehouse: e.target.value })}>
                <option value="">Select warehouse…</option>
                {DEMO_WAREHOUSES.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Source</label>
              <select className="fs-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                <option value="">Select source…</option>
                {DEMO_LOCATIONS.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                <option value="Vendor">Vendor</option>
                <option value="Customer Return">Customer Return</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Destination</label>
              <select className="fs-select" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })}>
                <option value="">Select destination…</option>
                {DEMO_LOCATIONS.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                <option value="Customer">Customer</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Reference</label>
            <input className="fs-input" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="e.g. PO-9921 or SO-1001" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Notes</label>
            <textarea className="fs-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes…" />
          </div>
          <div className="flex gap-2 pt-2">
            <button className="fs-btn-secondary flex-1" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="fs-btn-secondary flex-1" onClick={() => { handleCreate(); }} disabled={!form.product || formLoading} style={{ border: '1px solid var(--primary)', color: 'var(--primary)' }}>Save Draft</button>
            <button className="fs-btn-primary flex-1" onClick={handleCreate} disabled={!form.product || formLoading}>
              {formLoading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
