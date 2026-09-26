'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { fetchHealth } from '@/services/api';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  activeItem?: string;
}

export function AppShell({
  children,
  title = 'Autonomous Inventory Intelligence',
  activeItem = 'Dashboard',
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [supabaseStatus, setSupabaseStatus] = useState<string>('checking');

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      try {
        const res = await fetchHealth();
        if (!isMounted) return;

        if (res.success) {
          setBackendStatus('online');
          setSupabaseStatus(res.services?.supabase || 'unknown');
        } else {
          setBackendStatus('offline');
          setSupabaseStatus('disconnected');
        }
      } catch {
        if (!isMounted) return;
        setBackendStatus('offline');
        setSupabaseStatus('disconnected');
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
      {/* Sidebar navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeItem={activeItem}
      />

      {/* Main app body */}
      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          title={title}
          backendStatus={backendStatus}
          supabaseStatus={supabaseStatus}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-4 sm:px-6 text-center text-xs text-slate-400">
          <p>
            Fine Stock &copy; {new Date().getFullYear()} — Autonomous Inventory Intelligence Platform.
            Enterprise Ledger-First Architecture.
          </p>
        </footer>
      </div>
    </div>
  );
}
