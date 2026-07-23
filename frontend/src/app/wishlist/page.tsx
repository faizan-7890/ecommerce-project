'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { useWishlist } from '@/context/WishlistContext';
import { useUser } from '@clerk/nextjs';

export default function WishlistPage() {
  const { isSignedIn, isLoaded } = useUser();
  const { wishlistItems, loading } = useWishlist();

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Sign in to view your Wishlist</h2>
            <p className="text-slate-400 text-sm mb-6">Save your favorite items and check back anytime.</p>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105"
            >
              Sign In Now
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">My Wishlist</h1>
              <p className="text-sm text-slate-400 mt-1">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'saved item' : 'saved items'}
              </p>
            </div>
            {wishlistItems.length > 0 && (
              <Link
                href="/products"
                className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors"
              >
                Continue Shopping &rarr;
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-900/40 animate-pulse border border-slate-900" />
              ))}
            </div>
          ) : wishlistItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {wishlistItems.map((item) => (
                item.product ? <ProductCard key={item.id} product={item.product as any} /> : null
              ))}
            </div>
          ) : (
            <div className="p-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-slate-400">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-slate-500 mb-4">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Your wishlist is empty</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">Explore our collection and click the heart icon to save products for later.</p>
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 hover:scale-105 transition-transform"
              >
                Explore Products
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
