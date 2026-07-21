'use client';

import React from 'react';
import { CartProvider } from './CartContext';
import { ToastProvider } from './ToastContext';
import { TokenSync } from './TokenSync';
import ErrorBoundary from '@/components/ErrorBoundary';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <TokenSync />
        <CartProvider>
          {children}
        </CartProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

