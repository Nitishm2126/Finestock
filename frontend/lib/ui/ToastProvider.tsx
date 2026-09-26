'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--success)' }} />,
  error: <XCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--danger)' }} />,
  warning: <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--warning)' }} />,
  info: <Info className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--info)' }} />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const success = useCallback((t: string, m?: string) => toast('success', t, m), [toast]);
  const error = useCallback((t: string, m?: string) => toast('error', t, m), [toast]);
  const warning = useCallback((t: string, m?: string) => toast('warning', t, m), [toast]);
  const info = useCallback((t: string, m?: string) => toast('info', t, m), [toast]);

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div className="fs-toast-container" role="region" aria-label="Notifications">
        {toasts.map(t => (
          <div key={t.id} className={`fs-toast fs-toast-${t.type}`} role="alert">
            {icons[t.type]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
              {t.message && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t.message}</p>}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="flex-shrink-0 ml-2 rounded-md p-0.5 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
