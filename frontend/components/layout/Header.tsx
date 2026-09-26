'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Bell, Server, Database, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface HeaderProps {
  onMenuToggle: () => void;
  title?: string;
  backendStatus?: string;
  supabaseStatus?: string;
}

export function Header({
  onMenuToggle,
  title = 'System Overview',
  backendStatus = 'connecting...',
  supabaseStatus = 'checking...',
}: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const isBackendOk = backendStatus === 'online';
  const isDbOk = supabaseStatus === 'connected';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Left section: Mobile menu + Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
          aria-label="Open navigation sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
            FS
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              {title}
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-400">
              Fine Stock Autonomous Platform
            </p>
          </div>
        </div>
      </div>

      {/* Right section: System Health Indicators + Notifications + User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Backend & Database Status Badges */}
        <div className="hidden md:flex items-center gap-2">
          {/* Backend API status */}
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
              isBackendOk
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
          >
            <Server className="h-3 w-3" />
            <span>API: {backendStatus}</span>
          </div>

          {/* Database status */}
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
              isDbOk
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-700 bg-slate-800 text-slate-300'
            }`}
          >
            <Database className="h-3 w-3" />
            <span>DB: {supabaseStatus}</span>
          </div>
        </div>

        {/* Notifications placeholder */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        {/* User Profile / Auth Actions */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-semibold text-xs shadow-inner">
              {user.first_name[0]}
              {user.last_name[0]}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-medium text-slate-200 leading-tight">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold">{user.role}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Link>
            <Link
              href="/register"
              className="hidden sm:flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              <span>Register</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
