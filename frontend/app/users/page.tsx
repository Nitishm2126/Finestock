'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState } from '@/components/ui/UI';
import { Drawer, Modal } from '@/components/ui/Overlay';
import { useToast } from '@/lib/ui/ToastProvider';
import { Users, Plus, Search, Download, Shield } from 'lucide-react';
import { demoGetUsers, demoCreateUser, demoDeactivateUser } from '@/lib/demo/store';
import { fetchUsers } from '@/services/user.service';
import { DEMO_ROLES } from '@/lib/demo/data';

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserEntry = any;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  INVENTORY_MANAGER: 'Inventory Manager',
  WAREHOUSE_SUPERVISOR: 'Warehouse Supervisor',
  WAREHOUSE_STAFF: 'Warehouse Staff',
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['Full system access', 'User management', 'All modules', 'Settings & Configuration'],
  INVENTORY_MANAGER: ['Products', 'Inventory', 'Operations', 'Reports', 'Ledger view'],
  WAREHOUSE_SUPERVISOR: ['Inventory', 'Operations', 'Warehouse management', 'Ledger view'],
  WAREHOUSE_STAFF: ['Inventory view', 'Operations execution', 'Basic reports'],
};

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const colors = ['#3157D5', '#16866A', '#C88719', '#D94A4A', '#3478C8'];
  const colorIdx = name.charCodeAt(0) % colors.length;
  const dim = size === 'sm' ? 30 : 36;
  return (
    <div
      style={{ width: dim, height: dim, borderRadius: '50%', background: colors[colorIdx], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size === 'sm' ? 11 : 13, fontWeight: 700, flexShrink: 0 }}
    >
      {initials}
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selected, setSelected] = useState<UserEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', role_id: 'role-4', password: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemo) {
        setUsers(demoGetUsers());
      } else {
        const data = await fetchUsers(token!);
        setUsers(data);
      }
    } catch {
      toast.error('Unable to load users', 'Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated, loadData]);

  const filtered = users.filter(u => {
    const name = `${u.first_name} ${u.last_name}`.toLowerCase();
    const matchSearch = !searchQuery || name.includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'All' || u.role?.name === roleFilter;
    return matchSearch && matchRole;
  });

  const handleCreate = async () => {
    if (!form.first_name || !form.email) { toast.warning('Name and email are required'); return; }
    setFormLoading(true);
    try {
      const role = DEMO_ROLES.find(r => r.id === form.role_id);
      if (isDemo) {
        demoCreateUser({ ...form, role, role_name: role?.name });
        toast.success('User created', `${form.first_name} ${form.last_name} has been added.`);
        setCreateOpen(false);
        setForm({ first_name: '', last_name: '', email: '', role_id: 'role-4', password: '' });
        loadData();
      }
    } catch {
      toast.error('Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = (u: UserEntry) => {
    if (isDemo) {
      demoDeactivateUser(u.id);
      toast.success('User deactivated', `${u.first_name} ${u.last_name} has been deactivated.`);
      if (drawerOpen) setDrawerOpen(false);
      loadData();
    }
  };

  const exportCSV = () => {
    const rows = [['Name', 'Email', 'Role', 'Status', 'Joined']];
    filtered.forEach(u => rows.push([`${u.first_name} ${u.last_name}`, u.email, u.role?.name || '', u.is_active ? 'Active' : 'Inactive', new Date(u.created_at).toLocaleDateString()]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete', 'users.csv downloaded.');
  };

  if (authLoading) return null;

  const ROLES_FILTER = ['All', 'ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_SUPERVISOR', 'WAREHOUSE_STAFF'];

  return (
    <AppShell title="Users">
      <div className="fs-page-inner space-y-6">

        {/* Header */}
        <div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Administration / Users</p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Users & Access</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Manage team members and platform access.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="fs-btn-secondary" onClick={exportCSV}><Download className="h-4 w-4" /> Export</button>
              <button className="fs-btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add User</button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Users" value={users.length} icon={<Users className="h-4 w-4" />} />
          <MetricCard label="Active" value={users.filter(u => u.is_active).length} color="success" />
          <MetricCard label="Administrators" value={users.filter(u => u.role?.name === 'ADMIN').length} color="primary" />
          <MetricCard label="Warehouse Staff" value={users.filter(u => u.role?.name?.includes('WAREHOUSE')).length} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search by name or email…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="fs-input pl-9" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {ROLES_FILTER.map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: roleFilter === r ? 'var(--primary)' : 'var(--surface)',
                  color: roleFilter === r ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${roleFilter === r ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                {r === 'All' ? 'All Roles' : ROLE_LABELS[r] || r}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="fs-surface overflow-hidden">
          {loading ? (
            <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>Loading users…</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Users className="h-10 w-10" />} title="No users found" description="Add team members to get started." action={<button className="fs-btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add User</button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="fs-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td>
                        <button className="flex items-center gap-3 text-left" onClick={() => { setSelected(u); setDrawerOpen(true); }}>
                          <Avatar name={`${u.first_name} ${u.last_name}`} size="sm" />
                          <div>
                            <p className="font-medium hover:underline text-sm" style={{ color: 'var(--text-primary)' }}>{u.first_name} {u.last_name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                          </div>
                        </button>
                      </td>
                      <td>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background: 'var(--surface-muted)', color: 'var(--text-secondary)' }}>
                          {ROLE_LABELS[u.role?.name] || u.role?.name || 'N/A'}
                        </span>
                      </td>
                      <td><StatusBadge status={u.is_active ? 'Active' : 'Inactive'} size="sm" /></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-1">
                          <button className="fs-btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => { setSelected(u); setDrawerOpen(true); }}>View</button>
                          {u.is_active && <button className="fs-btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleDeactivate(u)}>Deactivate</button>}
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

      {/* User Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected ? `${selected.first_name} ${selected.last_name}` : ''} subtitle={selected?.email} width={520}>
        {selected && (
          <div className="space-y-5">
            {/* Profile */}
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
              <Avatar name={`${selected.first_name} ${selected.last_name}`} size="md" />
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.first_name} {selected.last_name}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.email}</p>
                <StatusBadge status={selected.is_active ? 'Active' : 'Inactive'} size="sm" />
              </div>
            </div>

            {/* Role */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>ROLE</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ROLE_LABELS[selected.role?.name] || selected.role?.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{selected.role?.description}</p>
            </div>

            {/* Permissions */}
            <div>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>PERMISSIONS</p>
              <div className="space-y-1.5">
                {(ROLE_PERMISSIONS[selected.role?.name] || []).map(perm => (
                  <div key={perm} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'var(--success-soft)' }}>
                    <Shield className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                    <span className="text-sm" style={{ color: 'var(--success)' }}>{perm}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'User ID', value: selected.id },
                { label: 'Joined', value: new Date(selected.created_at).toLocaleDateString() },
              ].map(f => (
                <div key={f.label} className="p-3 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</p>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{f.value}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            {selected.is_active && (
              <button className="fs-btn-danger w-full" onClick={() => handleDeactivate(selected)}>Deactivate User</button>
            )}
          </div>
        )}
      </Drawer>

      {/* Create User Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add User" subtitle="Create a new team member account">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>First Name *</label>
              <input className="fs-input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Jane" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Last Name</label>
              <input className="fs-input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Smith" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email *</label>
            <input type="email" className="fs-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Role</label>
            <select className="fs-select" value={form.role_id} onChange={e => setForm({ ...form, role_id: e.target.value })}>
              {DEMO_ROLES.map(r => <option key={r.id} value={r.id}>{ROLE_LABELS[r.name] || r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
            <input type="password" className="fs-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="fs-btn-secondary flex-1" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="fs-btn-primary flex-1" onClick={handleCreate} disabled={!form.first_name || !form.email || formLoading}>
              {formLoading ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
