'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState, SkeletonCard } from '@/components/ui/UI';
import { Modal, Drawer } from '@/components/ui/Overlay';
import { useToast } from '@/lib/ui/ToastProvider';
import {
  Truck, Plus, Search, Filter, Mail, Phone, MapPin, Clock, Edit, CheckCircle, XCircle
} from 'lucide-react';
import {
  Supplier,
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  toggleSupplierStatus,
} from '@/services/supplier.service';

export default function SuppliersPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    lead_time_days: 7,
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSuppliers(token || '');
      setSuppliers(data);
    } catch {
      toast.error('Failed to load suppliers', 'Could not retrieve supplier records from server.');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditId(null);
    setForm({
      name: '',
      code: `SUP-${Math.floor(100 + Math.random() * 900)}`,
      email: '',
      phone: '',
      address: '',
      lead_time_days: 7,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setIsEditing(true);
    setEditId(sup.id);
    setForm({
      name: sup.name,
      code: sup.code,
      email: sup.email || '',
      phone: sup.phone || '',
      address: sup.address || '',
      lead_time_days: sup.lead_time_days,
      notes: sup.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.warning('Validation Error', 'Supplier Name and Code are required.');
      return;
    }
    setFormLoading(true);
    try {
      if (isEditing && editId) {
        await updateSupplier(editId, form, token || '');
        toast.success('Supplier Updated', `${form.name} was successfully modified.`);
      } else {
        await createSupplier(form, token || '');
        toast.success('Supplier Created', `New supplier ${form.name} registered.`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Operation Failed', err.message || 'Error saving supplier details.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (sup: Supplier) => {
    try {
      await toggleSupplierStatus(sup.id, !sup.is_active, token || '');
      toast.success(
        sup.is_active ? 'Supplier Deactivated' : 'Supplier Activated',
        `${sup.name} is now ${sup.is_active ? 'inactive' : 'active'}.`
      );
      loadData();
    } catch {
      toast.error('Failed to update status', 'Please try again.');
    }
  };

  const filtered = suppliers.filter(s => {
    const matchStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? s.is_active
        : !s.is_active;

    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q));

    return matchStatus && matchSearch;
  });

  const activeCount = suppliers.filter(s => s.is_active).length;
  const avgLeadTime = suppliers.length > 0
    ? Math.round(suppliers.reduce((acc, s) => acc + s.lead_time_days, 0) / suppliers.length)
    : 0;

  return (
    <AppShell title="Suppliers">
      <div className="fs-page-inner space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-[var(--primary)]" />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Supplier Management
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Manage authorized procurement vendors, lead times, and inbound order channels.
            </p>
          </div>
          <button onClick={handleOpenCreate} className="fs-btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Supplier
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Total Suppliers"
            value={suppliers.length}
            icon={<Truck className="h-5 w-5" />}
          />
          <MetricCard
            label="Active Vendors"
            value={activeCount}
            color="success"
            icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
          />
          <MetricCard
            label="Avg. Lead Time"
            value={`${avgLeadTime} days`}
            icon={<Clock className="h-5 w-5" />}
          />
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by vendor name, code, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="fs-input pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Status:</span>
            <div className="flex rounded-lg p-1 border" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    statusFilter === tab
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filtered.length === 0 ? (
          <div className="fs-surface">
            <EmptyState
              icon={<Truck className="h-10 w-10" />}
              title="No suppliers found"
              description={searchQuery ? 'No vendors matched your search criteria.' : 'No suppliers registered yet in your organization.'}
              action={
                <button onClick={handleOpenCreate} className="fs-btn-primary">
                  <Plus className="h-4 w-4 mr-2 inline" /> Add First Supplier
                </button>
              }
            />
          </div>
        ) : (
          <div className="fs-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="fs-table">
                <thead>
                  <tr>
                    <th>Vendor Name</th>
                    <th>Supplier Code</th>
                    <th>Contact</th>
                    <th>Lead Time</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(sup => (
                    <tr key={sup.id} className="hover:bg-[var(--surface-muted)] transition-colors">
                      <td className="font-semibold text-sm">
                        <button
                          onClick={() => { setSelectedSupplier(sup); setDrawerOpen(true); }}
                          className="hover:underline text-[var(--primary)] text-left"
                        >
                          {sup.name}
                        </button>
                        {sup.notes && <p className="text-xs truncate max-w-xs text-[var(--text-muted)]">{sup.notes}</p>}
                      </td>
                      <td>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border)]">
                          {sup.code}
                        </span>
                      </td>
                      <td className="text-xs">
                        {sup.email && <div className="flex items-center gap-1.5 text-[var(--text-secondary)]"><Mail className="h-3.5 w-3.5 text-[var(--text-muted)]" /> {sup.email}</div>}
                        {sup.phone && <div className="flex items-center gap-1.5 text-[var(--text-muted)] mt-0.5"><Phone className="h-3.5 w-3.5 text-[var(--text-muted)]" /> {sup.phone}</div>}
                      </td>
                      <td>
                        <span className="text-xs font-medium px-2 py-1 rounded-md bg-[var(--surface-muted)] border border-[var(--border)]">
                          {sup.lead_time_days} days
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={sup.is_active ? 'Active' : 'Inactive'} size="sm" />
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(sup)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                            title="Edit Supplier"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(sup)}
                            className={`p-1.5 rounded-lg border text-xs font-medium ${
                              sup.is_active
                                ? 'border-red-500/20 text-red-500 hover:bg-red-500/10'
                                : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10'
                            }`}
                            title={sup.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {sup.is_active ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create / Edit Modal */}
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isEditing ? 'Edit Supplier' : 'Register New Supplier'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Industrial Components"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="fs-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Supplier Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUP-IND-01"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  className="fs-input font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Contact Email
                </label>
                <input
                  type="email"
                  placeholder="procurement@vendor.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="fs-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 234-5678"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="fs-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Default Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.lead_time_days}
                  onChange={e => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 1 })}
                  className="fs-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Physical Address
                </label>
                <input
                  type="text"
                  placeholder="City, State / Logistics Park"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="fs-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Procurement Notes / Terms
              </label>
              <textarea
                rows={2}
                placeholder="Contract details, freight terms (FOB/CIF), etc."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="fs-input"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="fs-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="fs-btn-primary"
              >
                {formLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Supplier'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Detail Drawer */}
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={selectedSupplier?.name || 'Supplier Detail'}
        >
          {selectedSupplier && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border)]">
                    {selectedSupplier.code}
                  </span>
                  <h3 className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                    {selectedSupplier.name}
                  </h3>
                </div>
                <StatusBadge status={selectedSupplier.is_active ? 'Active' : 'Inactive'} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                  <span style={{ color: 'var(--text-secondary)' }}>{selectedSupplier.email || 'No email registered'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                  <span style={{ color: 'var(--text-secondary)' }}>{selectedSupplier.phone || 'No phone registered'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                  <span style={{ color: 'var(--text-secondary)' }}>{selectedSupplier.address || 'No address registered'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                  <span style={{ color: 'var(--text-secondary)' }}>Expected Lead Time: <strong>{selectedSupplier.lead_time_days} days</strong></span>
                </div>
              </div>

              {selectedSupplier.notes && (
                <div className="p-3 rounded-lg bg-[var(--surface-muted)] border" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Procurement Notes</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedSupplier.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => { setDrawerOpen(false); handleOpenEdit(selectedSupplier); }}
                  className="fs-btn-secondary flex-1"
                >
                  <Edit className="h-4 w-4 mr-2 inline" /> Edit
                </button>
                <button
                  onClick={() => { handleToggleActive(selectedSupplier); setDrawerOpen(false); }}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold border ${
                    selectedSupplier.is_active
                      ? 'border-red-500/30 text-red-500 hover:bg-red-500/10'
                      : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                  }`}
                >
                  {selectedSupplier.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AppShell>
  );
}
