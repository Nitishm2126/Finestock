'use client';

import React, { useState, useEffect } from 'react';
import { TopNav } from './TopNav';
import { fetchHealth } from '@/services/api';
import { Modal } from '@/components/ui/Overlay';
import { Search } from 'lucide-react';
import { DEMO_PRODUCTS, DEMO_WAREHOUSES, DEMO_USERS, DEMO_OPERATIONS } from '@/lib/demo/data';
import { useRouter } from 'next/navigation';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

interface SearchResult {
  id: string;
  type: string;
  label: string;
  sublabel: string;
  href: string;
}

function buildSearchResults(query: string): SearchResult[] {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];
  DEMO_PRODUCTS.forEach(p => {
    if (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) {
      results.push({ id: p.id, type: 'Product', label: p.name, sublabel: p.sku, href: '/products' });
    }
  });
  DEMO_WAREHOUSES.forEach(w => {
    if (w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q)) {
      results.push({ id: w.id, type: 'Warehouse', label: w.name, sublabel: w.code, href: '/warehouses' });
    }
  });
  DEMO_USERS.forEach(u => {
    if ((u.first_name + ' ' + u.last_name).toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) {
      results.push({ id: u.id, type: 'User', label: `${u.first_name} ${u.last_name}`, sublabel: u.email, href: '/users' });
    }
  });
  DEMO_OPERATIONS.forEach(o => {
    if (o.id.toLowerCase().includes(q) || o.product.toLowerCase().includes(q)) {
      results.push({ id: o.id, type: 'Operation', label: o.id, sublabel: o.product, href: '/operations' });
    }
  });
  return results.slice(0, 8);
}

export function AppShell({ children, title }: AppShellProps) {
  const router = useRouter();
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = searchQuery.length > 1 ? buildSearchResults(searchQuery) : [];

  useEffect(() => {
    // Suppress title param — we just use it for SEO
    void title;

    let isMounted = true;
    async function checkStatus() {
      try {
        const res = await fetchHealth();
        if (isMounted) setBackendStatus(res.success ? 'online' : 'offline');
      } catch {
        if (isMounted) setBackendStatus('offline');
      }
    }
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [title]);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav onSearchOpen={() => setSearchOpen(true)} backendStatus={backendStatus} />

      {/* Page content */}
      <div className="fs-page">
        {children}
      </div>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        Fine Stock © {new Date().getFullYear()} — Autonomous Inventory Intelligence Platform. Ledger-First Architecture.
      </footer>

      {/* Global Search Modal */}
      <Modal open={searchOpen} onClose={() => { setSearchOpen(false); setSearchQuery(''); }} title="Search">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              autoFocus
              type="text"
              placeholder="Search products, warehouses, operations, users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="fs-input pl-9"
            />
          </div>
          {searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map(r => (
                <button
                  key={r.id}
                  onClick={() => { router.push(r.href); setSearchOpen(false); setSearchQuery(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full fs-badge-primary fs-badge">{r.type}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{r.sublabel}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.length > 1 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No results found for "{searchQuery}"</p>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Start typing to search…</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
