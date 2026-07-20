'use client';

import React from 'react';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { ToastProvider } from './ToastContext';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
