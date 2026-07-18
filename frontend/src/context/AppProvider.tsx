'use client';

import React from 'react';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  );
}
