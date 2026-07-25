'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastOptions {
  duration?: number;
  id?: string;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const typeStyles: Record<ToastType, string> = {
  success: 'border-l-success bg-surface/95',
  error: 'border-l-danger bg-surface/95',
  info: 'border-l-accent-from bg-surface/95',
};

const defaultDuration: Record<ToastType, number> = {
  success: 2500,
  error: 4000,
  info: 3000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reduced = useReducedMotion();

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', options?: ToastOptions) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const duration = options?.duration ?? defaultDuration[type];
      setToasts((prev) => {
        const next = [...prev, { id, message, type, duration }];
        return next.slice(-3);
      });
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              transition={
                reduced
                  ? { duration: 0.12 }
                  : { type: 'spring', stiffness: 380, damping: 28 }
              }
              role={toast.type === 'error' ? 'alert' : 'status'}
              aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
              className={cn(
                'pointer-events-auto rounded-xl border border-border border-l-4 px-4 py-3 text-sm font-medium text-text-main shadow-xl backdrop-blur-md',
                typeStyles[toast.type]
              )}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
