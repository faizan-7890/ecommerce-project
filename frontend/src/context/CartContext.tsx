'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { useUser } from '@clerk/nextjs';
import type { Cart as RawCart, CartItem as RawCartItem } from '@/types';

interface CartContextType {
  cart: RawCart | null;
  loading: boolean;
  /** Total number of individual items (sum of quantities) */
  totalItems: number;
  /** Cart subtotal computed from product prices × quantities */
  subtotal: number;
  addToCart: (productId: number, variantId?: number | null, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearCartState: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/** Compute the effective unit price for a cart item (variant price wins, then discount, then base). */
function getItemUnitPrice(item: RawCartItem): number {
  if (item.variant?.price != null) return Number(item.variant.price);
  const base = Number(item.product?.basePrice ?? 0);
  const discount = Number(item.product?.discountPrice ?? 0);
  return Math.max(base - discount, 0);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const [cart, setCart] = useState<RawCart | null>(null);
  const [loading, setLoading] = useState(false);

  const totalItems = useMemo(() => {
    if (!cart?.items) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    if (!cart?.items) return 0;
    return cart.items.reduce((sum, item) => sum + getItemUnitPrice(item) * item.quantity, 0);
  }, [cart]);

  const refreshCart = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    try {
      const data = await api.get<RawCart>('/cart');
      setCart(data);
    } catch (err) {
      console.warn('Could not fetch cart:', err);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    let isCancelled = false;
    if (!isLoaded) return;

    if (!isSignedIn) {
      Promise.resolve().then(() => {
        if (!isCancelled) setCart(null);
      });
      return;
    }

    api.get<RawCart>('/cart')
      .then((data) => {
        if (!isCancelled) setCart(data);
      })
      .catch((err) => {
        console.warn('Could not fetch cart:', err);
        if (!isCancelled) setCart(null);
      });

    return () => {
      isCancelled = true;
    };
  }, [isSignedIn, isLoaded]);

  const addToCart = async (productId: number, variantId: number | null = null, quantity: number = 1) => {
    if (!isSignedIn) {
      throw new Error('Please login to add items to cart');
    }
    setLoading(true);
    try {
      const data = await api.post<RawCart>('/cart/items', { productId, variantId, quantity });
      setCart(data); // backend returns full CartOut
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    setLoading(true);
    try {
      const data = await api.put<RawCart>(`/cart/items/${itemId}`, { quantity });
      setCart(data); // backend returns full CartOut
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: number) => {
    setLoading(true);
    try {
      const data = await api.delete<RawCart>(`/cart/items/${itemId}`);
      setCart(data); // backend returns full CartOut
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearCartState = () => {
    setCart(null);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        totalItems,
        subtotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        refreshCart,
        clearCartState,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
