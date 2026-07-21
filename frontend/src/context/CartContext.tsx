'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useUser } from '@clerk/nextjs';

interface CartItem {
  id: number;
  productId: number;
  variantId: number | null;
  sku: string;
  name: string;
  basePrice: number;
  discount: number;
  finalUnitPrice: number;
  quantity: number;
  stock: number;
  size: string | null;
  color: string | null;
  image: string | null;
  subtotal: number;
}

interface Cart {
  id: number;
  items: CartItem[];
  subtotal: number;
  totalItems: number;
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  addToCart: (productId: number, variantId?: number | null, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearCartState: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    try {
      const data = await api.get('/cart');
      setCart(data);
    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      refreshCart();
    } else if (isLoaded && !isSignedIn) {
      setCart(null);
    }
  }, [isSignedIn, isLoaded, refreshCart]);

  const addToCart = async (productId: number, variantId: number | null = null, quantity: number = 1) => {
    if (!isSignedIn) {
      throw new Error('Please login to add items to cart');
    }
    setLoading(true);
    try {
      const data = await api.post('/cart/items', { productId, variantId, quantity });
      setCart(data);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    setLoading(true);
    try {
      const data = await api.put(`/cart/items/${itemId}`, { quantity });
      setCart(data);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: number) => {
    setLoading(true);
    try {
      const data = await api.delete(`/cart/items/${itemId}`);
      setCart(data);
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
