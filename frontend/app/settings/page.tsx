'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/lib/ui/ToastProvider';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { Settings, User, Shield, Bell, Palette, Database, RefreshCw, Sun, Moon, Monitor } from 'lucide-react';
import { demoResetAll } from '@/lib/demo/store';
import { Modal } from '@/components/ui/Overlay';

const TABS = [
  { id: 'organization', label: 'Organization', icon: Settings },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'system', label: 'System', icon: Database },
];

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('organization');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: 'FineStock Corp', timezone: 'Asia/Kolkata', currency: 'INR', language: 'English' });

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);

  if (authLoading) return null;

  const handleResetDemo = () => {
    demoResetAll();
    toast.success('Demo data reset', 'All demo data has been restored to defaults.');
    setResetConfirm(false);
  };

  return (
    <AppShell title="Settings">
      <div className="fs-page-inner">
        <div className="mb-6">
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Administration / Settings</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Manage your organization, preferences and system configuration.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:w-56 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
                    style={{
                      background: activeTab === tab.id ? 'var(--primary-soft)' : 'transparent',
                      color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 fs-surface p-6">
            {/* Organization */}
            {activeTab === 'organization' && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Organization Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Organization Name</label>
                    <input className="fs-input" value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Timezone</label>
                    <select className="fs-select" value={orgForm.timezone} onChange={e => setOrgForm({ ...orgForm, timezone: e.target.value })}>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Currency</label>
                    <select className="fs-select" value={orgForm.currency} onChange={e => setOrgForm({ ...orgForm, currency: e.target.value })}>
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Language</label>
                    <select className="fs-select" value={orgForm.language} onChange={e => setOrgForm({ ...orgForm, language: e.target.value })}>
                      <option value="English">English</option>
                    </select>
                  </div>
                </div>
                <div className="pt-2">
                  <button className="fs-btn-primary" onClick={() => toast.success('Settings saved', 'Organization settings have been updated.')}>Save Changes</button>
                </div>
              </div>
            )}

            {/* Profile */}
            {activeTab === 'profile' && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>First Name</label>
                    <input className="fs-input" defaultValue={user?.first_name || 'Fine Stock'} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Last Name</label>
                    <input className="fs-input" defaultValue={user?.last_name || 'Admin'} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                    <input className="fs-input" type="email" defaultValue={user?.email || 'admin@finestock.demo'} />
                  </div>
                </div>
                <button className="fs-btn-primary" onClick={() => toast.success('Profile updated')}>Save Profile</button>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Security</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Current Password</label>
                    <input className="fs-input" type="password" placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>New Password</label>
                    <input className="fs-input" type="password" placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirm New Password</label>
                    <input className="fs-input" type="password" placeholder="••••••••" />
                  </div>
                </div>
                {isDemo && <div className="text-xs p-3 rounded-xl" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>Demo Environment — password changes are not persisted.</div>}
                <button className="fs-btn-primary" onClick={() => toast.info('Password change requires backend in production mode.')}>Update Password</button>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Notification Preferences</h2>
                <div className="space-y-3">
                  {[
                    { id: 'low_stock', label: 'Low Stock Alerts', desc: 'Notify when products fall below reorder point' },
                    { id: 'op_complete', label: 'Operation Completed', desc: 'Notify when operations change status' },
                    { id: 'user_added', label: 'New User Added', desc: 'Notify when a new team member joins' },
                  ].map(n => (
                    <div key={n.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{n.label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{n.desc}</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--primary)] rounded" />
                    </div>
                  ))}
                </div>
                <button className="fs-btn-primary" onClick={() => toast.success('Notification preferences saved')}>Save</button>
              </div>
            )}

            {/* Appearance */}
            {activeTab === 'appearance' && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Appearance</h2>
                <div>
                  <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Theme</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor },
                    ].map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => { setTheme(opt.value as 'light' | 'dark' | 'system'); toast.success(`Theme set to ${opt.label}`); }}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
                          style={{
                            borderColor: theme === opt.value ? 'var(--primary)' : 'var(--border)',
                            background: theme === opt.value ? 'var(--primary-soft)' : 'var(--surface-muted)',
                            color: theme === opt.value ? 'var(--primary)' : 'var(--text-secondary)',
                          }}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-sm font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* System */}
            {activeTab === 'system' && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>System</h2>

                {isDemo && (
                  <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--warning)', background: 'var(--warning-soft)' }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--warning)' }}>Demo Environment</p>
                    <p className="text-xs" style={{ color: 'var(--warning)' }}>Running with DEMO_MODE=true. Data is stored in localStorage. Not connected to a live database.</p>
                  </div>
                )}

                <div className="space-y-3">
                  {[
                    { label: 'API Endpoint', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api' },
                    { label: 'Demo Mode', value: isDemo ? 'Enabled' : 'Disabled' },
                    { label: 'Phase', value: 'Phase 1 — Core Foundation' },
                    { label: 'Version', value: '1.0.0-alpha' },
                  ].map(f => (
                    <div key={f.label} className="flex justify-between items-center p-3 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{f.label}</span>
                      <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{f.value}</span>
                    </div>
                  ))}
                </div>

                {isDemo && (
                  <div className="pt-2">
                    <button className="fs-btn-danger" onClick={() => setResetConfirm(true)}>
                      <RefreshCw className="h-4 w-4" /> Reset Demo Data
                    </button>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Clears all locally created demo records and restores defaults.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirm Modal */}
      <Modal open={resetConfirm} onClose={() => setResetConfirm(false)} title="Reset Demo Data">
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          This will clear all demo-created products, warehouses, operations and users, and restore the default dataset. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button className="fs-btn-secondary flex-1" onClick={() => setResetConfirm(false)}>Cancel</button>
          <button className="fs-btn-danger flex-1" onClick={handleResetDemo}>Reset Demo Data</button>
        </div>
      </Modal>
    </AppShell>
  );
}
