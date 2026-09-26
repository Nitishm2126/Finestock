'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Boxes,
  ArrowLeftRight,
  BookOpenText,
  Sparkles,
  Settings,
  X,
  ShieldCheck,
  Users,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export const navigationSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Inventory',
    items: [
      { name: 'Products', href: '/products', icon: Package },
      { name: 'Warehouses', href: '/warehouses', icon: Warehouse },
      { name: 'Stock', href: '/inventory', icon: Boxes },
    ]
  },
  {
    label: 'Control',
    items: [
      { name: 'Operations', href: '/operations', icon: ArrowLeftRight },
      { name: 'Ledger', href: '/ledger', icon: BookOpenText },
    ]
  },
  {
    label: 'Intelligence',
    items: [
      { name: 'Inventory Health', href: '#', icon: Sparkles, badge: 'AI' },
      { name: 'Predictive Radar', href: '#', icon: Sparkles, badge: 'AI' },
      { name: 'AI Copilot', href: '#', icon: Sparkles, badge: 'AI' },
      { name: 'Anomalies', href: '#', icon: Sparkles, badge: 'AI' },
      { name: 'Simulator', href: '#', icon: Sparkles, badge: 'AI' },
    ]
  },
  {
    label: 'Administration',
    items: [
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Roles & Permissions', href: '#', icon: ShieldCheck },
      { name: 'Settings', href: '#', icon: Settings },
    ]
  }
];

export function Sidebar({ isOpen, onClose, activeItem = 'Dashboard' }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col bg-slate-900 border-r border-slate-800 text-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-lg shadow-sm">
              FS
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block leading-none">
                Fine Stock
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400 block mt-1">
                Autonomous Inventory
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {navigationSections.map((section, idx) => (
            <div key={idx} className="mb-6 last:mb-0">
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {section.label}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.name === activeItem || (activeItem === 'Inventory' && item.name === 'Stock');
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 transition-colors ${
                            isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'
                          }`}
                        />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Core Architecture Badge */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Immutable Ledger Core</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              &ldquo;The ledger is truth, everything else is a view.&rdquo;
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
