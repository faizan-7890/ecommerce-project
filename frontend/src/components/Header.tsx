'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import MiniCart from '@/components/MiniCart';
import { AnimatedBadge } from '@/components/motion';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/cn';

interface SearchResultProduct {
  id: number;
  title: string;
  name?: string;
  price: number;
  basePrice?: number | string;
  slug?: string;
  images?: { url: string }[];
  category?: { name?: string };
}

export default function Header() {
  const { user, isSignedIn } = useUser();
  const { totalItems } = useCart();
  const { wishlistIds } = useWishlist();
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      const timer = setTimeout(() => {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get<{ products?: SearchResultProduct[] }>(
          `/products?search=${encodeURIComponent(trimmed)}&limit=5`
        );
        setSearchResults(res.products || []);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchDropdown(false);
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const cartCount = totalItems;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b transition-all duration-200',
        scrolled
          ? 'border-border bg-surface/90 shadow-xl shadow-black/20 backdrop-blur-md'
          : 'border-border/60 bg-bg-base/80 backdrop-blur-md'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center space-x-2">
            <span className="velo-accent-text text-2xl font-black tracking-wider transition-transform duration-300 group-hover:scale-105">
              VELOCE
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/products"
              data-active={pathname?.startsWith('/products') ? 'true' : 'false'}
              className="velo-nav-link text-sm font-semibold text-text-muted transition-colors hover:text-text-main"
            >
              Catalog
            </Link>
            <Link
              href="/orders"
              data-active={pathname?.startsWith('/orders') ? 'true' : 'false'}
              className="velo-nav-link text-sm font-semibold text-text-muted transition-colors hover:text-text-main"
            >
              Orders
            </Link>
          </nav>
        </div>

        <div ref={searchRef} className="relative hidden max-w-md flex-1 sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
              placeholder="Search premium products..."
              className="w-full rounded-xl border border-border bg-surface/80 py-1.5 pl-10 pr-4 text-xs font-medium text-text-main placeholder-text-muted transition-all duration-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <svg
              className="absolute left-3 top-2 h-4 w-4 text-text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <svg
                  className="h-3.5 w-3.5 animate-spin text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}
          </form>

          <AnimatePresence>
            {showSearchDropdown && (
              <motion.div
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="absolute left-0 right-0 top-full z-50 mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/95 shadow-2xl backdrop-blur-xl"
              >
                {searchResults.length > 0 ? (
                  <>
                    <div className="space-y-1 p-2">
                      {searchResults.map((prod, i) => (
                        <motion.div
                          key={prod.id}
                          initial={reduced ? false : { opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <Link
                            href={`/products/${prod.id}`}
                            onClick={() => setShowSearchDropdown(false)}
                            className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-bg-base/60"
                          >
                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-bg-base">
                              <Image
                                src={
                                  prod.images?.[0]?.url ||
                                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200&auto=format&fit=crop'
                                }
                                alt={prod.name || prod.title || 'Product'}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate text-xs font-bold text-text-main transition-colors group-hover:text-primary">
                                {prod.name || prod.title}
                              </h4>
                              <p className="truncate text-[10px] capitalize text-text-muted">
                                {prod.category?.name || 'Catalog'}
                              </p>
                            </div>
                            <span className="text-xs font-extrabold text-text-main">
                              {formatCurrency(parseFloat(String(prod.basePrice ?? prod.price ?? 0)))}
                            </span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                    <Link
                      href={`/products?search=${encodeURIComponent(searchQuery)}`}
                      onClick={() => setShowSearchDropdown(false)}
                      className="block p-2 text-center text-xs font-bold text-primary transition-colors hover:bg-primary/10"
                    >
                      View all results for &ldquo;{searchQuery}&rdquo; &rarr;
                    </Link>
                  </>
                ) : (
                  <div className="p-4 text-center text-xs text-text-muted">
                    No products found matching &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/wishlist"
            className="relative p-2 text-text-muted transition-colors duration-200 hover:text-danger"
            title="My Wishlist"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
            <AnimatedBadge count={wishlistIds.size} tone="danger" />
          </Link>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-text-muted transition-colors duration-200 hover:text-text-main"
            title="Cart"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <AnimatedBadge count={cartCount} tone="primary" />
          </button>

          {isSignedIn ? (
            <div className="ml-1 flex items-center gap-3">
              <Link
                href="/profile"
                className="hidden text-xs font-semibold text-text-muted transition-colors hover:text-text-main sm:block"
              >
                {user?.firstName || 'Account'}
              </Link>
              {user?.publicMetadata?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/20"
                >
                  Admin
                </Link>
              )}
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-7 h-7 rounded-full border border-border',
                  },
                }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <SignInButton mode="modal">
                <button className="px-3 py-1.5 text-xs font-bold text-text-muted transition-colors hover:text-text-main">
                  Sign in
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-bg-base shadow transition-all hover:brightness-110">
                  Sign up
                </button>
              </SignInButton>
            </div>
          )}
        </div>
      </div>
      <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}
