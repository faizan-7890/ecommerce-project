'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { useToast } from './ToastContext';

interface WishlistContextType {
  wishlistIds: Set<number>;
  wishlistItems: any[];
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

  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
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
      const items = (await api.get('/wishlist')) || [];
      setWishlistItems(items);
      setWishlistIds(new Set(items.map((item: any) => item.productId || item.product?.id)));
    } catch (err: any) {
      console.warn('Could not load wishlist:', err);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded) {
      refreshWishlist();
    }
  }, [isLoaded, isSignedIn, refreshWishlist]);

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
      const res = await api.post('/wishlist', { productId });
      addToast(res.message || (currentlyInWishlist ? 'Removed from wishlist' : 'Added to wishlist'), 'success');
      await refreshWishlist();
      return !currentlyInWishlist;
    } catch (err: any) {
      // Rollback on error
      setWishlistIds(wishlistIds);
      addToast(err.message || 'Failed to update wishlist', 'error');
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
