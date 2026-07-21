'use client';

import React from 'react';
import { CartProvider } from './CartContext';
import { ToastProvider } from './ToastContext';
import { TokenSync } from './TokenSync';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <TokenSync />
      <CartProvider>
        {children}
      </CartProvider>
    </ToastProvider>
  );
}
