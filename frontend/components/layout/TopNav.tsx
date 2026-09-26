'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Warehouse, Boxes, ArrowLeftRight, BookOpenText,
  Sparkles, Settings, Users, ShieldCheck, Menu, X, ChevronDown,
  Sun, Moon, Monitor, Bell, Search, HelpCircle, LogOut, User
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTheme } from '@/lib/theme/ThemeProvider';

const navGroups = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', href: '/products', icon: Package },
      { label: 'Warehouses', href: '/warehouses', icon: Warehouse },
      { label: 'Stock', href: '/inventory', icon: Boxes },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Operations', href: '/operations', icon: ArrowLeftRight },
      { label: 'Ledger', href: '/ledger', icon: BookOpenText },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Inventory Health', href: '/intelligence/health', icon: Sparkles },
      { label: 'Predictive Radar', href: '/intelligence/predictive', icon: Sparkles },
      { label: 'AI Copilot', href: '/intelligence/copilot', icon: Sparkles },
      { label: 'Anomalies', href: '/intelligence/anomalies', icon: Sparkles },
      { label: 'Simulator', href: '/intelligence/simulator', icon: Sparkles },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users', href: '/users', icon: Users },
      { label: 'Roles & Permissions', href: '/settings', icon: ShieldCheck },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

function NavDropdown({ group, currentPath }: { group: typeof navGroups[0]; currentPath: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = group.items.some(i => currentPath.startsWith(i.href));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'text-[var(--primary)] bg-[var(--primary-soft)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {group.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="fs-dropdown" style={{ minWidth: 220 }}>
          {group.items.map(item => {
            const Icon = item.icon;
            const active = currentPath === item.href;
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  const current = options.find(o => o.value === theme) || options[2];
  const CurrIcon = current.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-[var(--surface-muted)]"
        style={{ color: 'var(--text-secondary)' }}
        title="Theme"
        aria-label="Switch theme"
      >
        <CurrIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="fs-dropdown" style={{ right: 0, left: 'auto', minWidth: 150 }}>
          {options.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => { setTheme(opt.value); setOpen(false); }}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                  theme === opt.value
                    ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TopNavProps {
  onSearchOpen?: () => void;
  backendStatus?: 'online' | 'offline' | 'checking';
}

export function TopNav({ onSearchOpen, backendStatus = 'checking' }: TopNavProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const statusColor = backendStatus === 'online' ? 'var(--success)' : backendStatus === 'offline' ? 'var(--danger)' : 'var(--warning)';

  return (
    <>
      <nav className="fs-topnav" style={{ height: 56 }}>
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              FS
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Fine Stock</span>
              <span className="hidden md:block text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Inventory Intelligence</span>
            </div>
          </Link>

          {/* Desktop nav groups */}
          <div className="hidden lg:flex items-center gap-1">
            {navGroups.map(g => (
              <NavDropdown key={g.label} group={g} currentPath={pathname || ''} />
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* API status */}
            <div
              className="hidden sm:flex items-center gap-1.5 text-xs px-2 py-1 rounded-md"
              style={{ color: statusColor }}
              title={`API: ${backendStatus}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              <span className="hidden md:inline">API</span>
            </div>

            {/* Search */}
            <button
              onClick={onSearchOpen}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-[var(--surface-muted)]"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline text-xs">Search...</span>
              <kbd className="hidden md:inline text-[10px] px-1 rounded border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>⌘K</kbd>
            </button>

            {/* Theme */}
            <ThemeSwitcher />

            {/* Notifications */}
            <button
              className="relative rounded-lg p-2 transition-colors hover:bg-[var(--surface-muted)]"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full" style={{ background: 'var(--danger)' }} />
            </button>

            {/* Help */}
            <button
              className="rounded-lg p-2 transition-colors hover:bg-[var(--surface-muted)] hidden sm:flex"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            {/* User menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--surface-muted)]"
                aria-label="User menu"
                aria-expanded={userMenuOpen}
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'var(--primary)' }}
                >
                  {user?.first_name?.[0] ?? 'A'}{user?.last_name?.[0] ?? 'D'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {user?.first_name ?? 'Fine Stock'} {user?.last_name ?? 'Admin'}
                  </p>
                  <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>{user?.role ?? 'ADMIN'}</p>
                </div>
                <ChevronDown className="hidden md:block h-3 w-3" style={{ color: 'var(--text-muted)' }} />
              </button>
              {userMenuOpen && (
                <div className="fs-dropdown" style={{ right: 0, left: 'auto', minWidth: 200 }}>
                  <div className="px-3 py-2 border-b mb-1" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                  </div>
                  <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
                    <User className="h-4 w-4" /> Profile
                  </Link>
                  <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] text-[var(--text-secondary)]"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-lg p-2 transition-colors hover:bg-[var(--surface-muted)]"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div
            className="fixed top-0 left-0 bottom-0 z-50 w-80 overflow-y-auto lg:hidden"
            style={{ background: 'var(--nav-bg)', borderRight: '1px solid var(--nav-border)' }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm" style={{ background: 'var(--primary)', color: '#fff' }}>FS</div>
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Fine Stock</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {navGroups.map(group => (
                <div key={group.label}>
                  <p className="text-[11px] uppercase tracking-wider font-semibold mb-2 px-2" style={{ color: 'var(--text-muted)' }}>{group.label}</p>
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href + item.label}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            active
                              ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-medium'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
