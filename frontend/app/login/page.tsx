'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError('Please provide both email and password.'); return; }
    setIsSubmitting(true);
    try {
      await login({ email, password });
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Branding */}
        <div className="text-center mb-8">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl font-bold text-lg text-white mb-4"
            style={{ background: 'var(--primary)' }}
          >
            FS
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Fine Stock</h1>
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--primary)' }}>
            Autonomous Inventory Intelligence
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Sign in to your enterprise inventory console
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--warning)' }} />
            Demo Environment
          </div>
        </div>

        {/* Form Card */}
        <div className="fs-surface p-8">
          {/* Demo hint */}
          <div className="mb-6 p-3 rounded-xl text-xs" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            <strong>Demo credentials:</strong><br />
            admin@finestock.demo / FineStock@123
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl p-3.5 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@finestock.demo"
                  className="fs-input pl-9"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="fs-input pl-9 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="fs-btn-primary w-full justify-center mt-2"
              style={{ padding: '11px 16px', fontSize: 15 }}
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing In…</>
              ) : (
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold transition-colors hover:opacity-80" style={{ color: 'var(--primary)' }}>
              Register
            </Link>
          </div>
        </div>

        {/* Trust signal */}
        <div className="flex items-center justify-center gap-2 mt-5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>&ldquo;The ledger is truth, everything else is a view.&rdquo;</span>
        </div>
      </div>
    </div>
  );
}
