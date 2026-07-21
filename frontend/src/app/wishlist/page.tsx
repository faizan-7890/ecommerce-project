'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { api } from '@/lib/api';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/lib/currency';

interface WishlistItem {
  id: number;
  productId: number;
  product: {
    id: number;
    name: string;
    description: string;
    basePrice: number;
    discountPrice: number;
    slug: string;
    images: { id: number; url: string }[];
    variants: { id: number; stock: number }[];
  };
}

export default function WishlistPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { addToast } = useToast();

  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWishlist = async () => {
    try {
      const data = await api.get('/wishlist');
      setWishlist(data);
    } catch (err: any) {
      const error = err as Error;
      setError(error.message || 'Failed to load wishlist items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
      return;
    }
    if (isSignedIn) loadWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isLoaded, router]);

  const handleRemoveFromWishlist = async (productId: number) => {
    try {
      await api.delete(`/wishlist/${productId}`);
      setWishlist((prev) => prev.filter((item) => item.productId !== productId));
    } catch (err: any) {
      const error = err as Error;
      addToast(error.message || 'Failed to remove product from wishlist', 'error');
    }
  };

  const handleMoveToCart = async (item: WishlistItem) => {
    const product = item.product;
    // Always route to product page for variant selection (or confirm single SKU)
    // Do not pretend to move an unselected variant into the cart.
    router.push(`/products/${product.id}`);
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Loading your wishlist...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-extrabold text-white mb-8">My Wishlist</h1>

          {loading ? (
            <p className="text-slate-500 text-sm animate-pulse text-center">Loading saved items...</p>
          ) : error ? (
            <p className="text-red-400 text-sm text-center">{error}</p>
          ) : wishlist.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {wishlist.map((item) => {
                const prod = item.product;
                const originalPrice = parseFloat(prod.basePrice.toString());
                const discount = parseFloat(prod.discountPrice?.toString() || '0');
                const finalPrice = discount > 0 ? originalPrice - discount : originalPrice;

                const imgUrl = prod.images.length > 0
                  ? prod.images[0].url
                  : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop';

                // Inventory is held on variants only — no mock stock fallback
                const totalStock =
                  prod.variants && prod.variants.length > 0
                    ? prod.variants.reduce((acc, v) => acc + v.stock, 0)
                    : 0;

                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-900 bg-slate-900/40 p-4"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-950">
                      <Image
                        src={imgUrl}
                        alt={prod.name}
                        fill
                        className="object-cover object-center group-hover:scale-102 transition-transform duration-300"
                      />
                      {totalStock <= 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
                          <span className="rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata details */}
                    <div className="mt-4 flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white leading-tight">
                          <Link href={`/products/${prod.id}`} className="hover:text-violet-405">
                            {prod.name}
                          </Link>
                        </h3>
                        <p className="mt-1 text-xs text-slate-450 line-clamp-2">{prod.description}</p>
                        
                        <div className="mt-3 flex items-center gap-2">
                          {discount > 0 ? (
                            <>
                              <span className="text-sm font-extrabold text-white">{formatCurrency(finalPrice)}</span>
                              <span className="text-xs text-slate-500 line-through">{formatCurrency(originalPrice)}</span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-white">{formatCurrency(originalPrice)}</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col gap-2 border-t border-slate-900 pt-4 text-xs font-bold">
                        <button
                          onClick={() => handleMoveToCart(item)}
                          disabled={totalStock <= 0}
                          className="w-full rounded-xl bg-violet-600 hover:bg-violet-550 py-2.5 text-center text-white transition-colors"
                        >
                          {prod.variants && prod.variants.length > 0 ? 'Select Options' : 'Move to Cart'}
                        </button>
                        
                        <button
                          onClick={() => handleRemoveFromWishlist(prod.id)}
                          className="w-full rounded-xl bg-slate-850 hover:bg-slate-800 py-2.5 text-center text-slate-350 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/10 text-slate-500 text-sm">
              <p className="mb-6">Your wishlist is currently empty.</p>
              <Link
                href="/products"
                className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-2.5 text-xs font-bold text-white shadow-md"
              >
                Browse Products
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
