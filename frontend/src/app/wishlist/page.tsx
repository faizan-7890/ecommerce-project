'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import ProductSkeleton from '@/components/skeletons/ProductSkeleton';
import { EmptyState, FadeIn, Stagger, StaggerItem } from '@/components/motion';
import { useWishlist } from '@/context/WishlistContext';
import { useUser } from '@clerk/nextjs';

export default function WishlistPage() {
  const { isSignedIn, isLoaded } = useUser();
  const { wishlistItems, loading } = useWishlist();

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-base text-text-main">
        <Header />
        <main className="flex flex-1 items-center justify-center py-20">
          <EmptyState
            title="Sign in to view your Wishlist"
            description="Save your favorite items and check back anytime."
            action={
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-bg-base shadow-lg shadow-primary/25"
              >
                Sign In Now
              </Link>
            }
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-base text-text-main">
      <Header />

      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <FadeIn className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-text-main">
                My Wishlist
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                {wishlistItems.length}{' '}
                {wishlistItems.length === 1 ? 'saved item' : 'saved items'}
              </p>
            </div>
            {wishlistItems.length > 0 && (
              <Link
                href="/products"
                className="text-xs font-bold text-primary transition-colors hover:brightness-110"
              >
                Continue Shopping &rarr;
              </Link>
            )}
          </FadeIn>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : wishlistItems.length > 0 ? (
            <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {wishlistItems.map((item) =>
                item.product ? (
                  <StaggerItem key={item.id}>
                    <ProductCard product={item.product as any} />
                  </StaggerItem>
                ) : null
              )}
            </Stagger>
          ) : (
            <EmptyState
              title="Your wishlist is empty"
              description="Explore our collection and click the heart icon to save products for later."
              icon={
                <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              }
              action={
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-bg-base shadow-lg shadow-primary/20"
                >
                  Explore Products
                </Link>
              }
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
