'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { useToast } from './ToastContext';

export interface WishlistItem {
  id: number;
  productId: number;
  product?: {
    id: number;
    title: string;
    price: number;
    image?: string;
  };
}

interface WishlistContextType {
  wishlistIds: Set<number>;
  wishlistItems: WishlistItem[];
  loading: boolean;
  toggleWishlist: (productId: number) => Promise<boolean>;
  isInWishlist: (productId: number) => boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType>({
  wishlistIds: new Set(),
  wishlistItems: [],
  loading: false,
  toggleWishlist: async () => false,
  isInWishlist: () => false,
  refreshWishlist: async () => {},
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const { addToast } = useToast();

  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);

  const refreshWishlist = useCallback(async () => {
    if (!isSignedIn) {
      setWishlistItems([]);
      setWishlistIds(new Set());
      return;
    }
    try {
      setLoading(true);
      const items = (await api.get<WishlistItem[]>('/wishlist')) || [];
      setWishlistItems(items);
      setWishlistIds(new Set(items.map((item) => item.productId || item.product?.id || 0)));
    } catch (err: unknown) {
      console.warn('Could not load wishlist:', err);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    let isCancelled = false;
    if (!isLoaded) return;

    if (!isSignedIn) {
      Promise.resolve().then(() => {
        if (!isCancelled) {
          setWishlistItems([]);
          setWishlistIds(new Set());
        }
      });
      return;
    }

    api.get<WishlistItem[]>('/wishlist')
      .then((items) => {
        if (!isCancelled) {
          const validItems = items || [];
          setWishlistItems(validItems);
          setWishlistIds(new Set(validItems.map((item) => item.productId || item.product?.id || 0)));
        }
      })
      .catch((err) => {
        console.warn('Could not load wishlist:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const isInWishlist = useCallback((productId: number) => {
    return wishlistIds.has(productId);
  }, [wishlistIds]);

  const toggleWishlist = async (productId: number): Promise<boolean> => {
    if (!isSignedIn) {
      addToast('Please sign in to save items to your wishlist', 'error');
      return false;
    }

    const currentlyInWishlist = isInWishlist(productId);

    // Optimistic UI update
    const newIds = new Set(wishlistIds);
    if (currentlyInWishlist) {
      newIds.delete(productId);
    } else {
      newIds.add(productId);
    }
    setWishlistIds(newIds);

    try {
      const res = await api.post<{ message?: string }>('/wishlist', { productId });
      addToast(res.message || (currentlyInWishlist ? 'Removed from wishlist' : 'Added to wishlist'), 'success');
      await refreshWishlist();
      return !currentlyInWishlist;
    } catch (err: unknown) {
      // Rollback on error
      setWishlistIds(wishlistIds);
      const msg = err instanceof Error ? err.message : 'Failed to update wishlist';
      addToast(msg, 'error');
      return currentlyInWishlist;
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistItems,
        loading,
        toggleWishlist,
        isInWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
