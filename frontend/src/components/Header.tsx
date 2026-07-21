'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import MiniCart from '@/components/MiniCart';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';

export default function Header() {
  const { user, isSignedIn } = useUser();
  const { cart } = useCart();
  const { wishlistIds } = useWishlist();
  const router = useRouter();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search API request
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/products?search=${encodeURIComponent(searchQuery.trim())}&limit=5`);
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

  // Close search dropdown on click outside
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        {/* Logo & Main Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center space-x-2">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-500 to-pink-500 bg-clip-text text-2xl font-black tracking-wider text-transparent transition-transform duration-300 group-hover:scale-105">
              VELOCE
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/products"
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors duration-200"
            >
              Catalog
            </Link>
            <Link
              href="/orders"
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors duration-200"
            >
              Orders
            </Link>
          </nav>
        </div>

        {/* Live Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-md hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
              placeholder="Search premium products..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-1.5 pl-10 text-xs font-medium text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all duration-200"
            />
            <svg
              className="absolute left-3 top-2 h-4 w-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <svg className="h-3.5 w-3.5 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </form>

          {/* Autocomplete Search Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 divide-y divide-slate-850">
              {searchResults.length > 0 ? (
                <>
                  <div className="p-2 space-y-1">
                    {searchResults.map((prod) => (
                      <Link
                        key={prod.id}
                        href={`/products/${prod.id}`}
                        onClick={() => setShowSearchDropdown(false)}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-800/60 transition-colors group"
                      >
                        <div className="relative h-10 w-10 overflow-hidden rounded-md bg-slate-950 flex-shrink-0">
                          <Image
                            src={prod.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200&auto=format&fit=crop'}
                            alt={prod.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white group-hover:text-violet-400 transition-colors truncate">
                            {prod.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 capitalize truncate">
                            {prod.category?.name || 'Catalog'}
                          </p>
                        </div>
                        <span className="text-xs font-extrabold text-white">
                          {formatCurrency(parseFloat(prod.basePrice))}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={`/products?search=${encodeURIComponent(searchQuery)}`}
                    onClick={() => setShowSearchDropdown(false)}
                    className="block p-2 text-center text-xs font-bold text-violet-400 hover:bg-violet-500/10 transition-colors"
                  >
                    View all results for &ldquo;{searchQuery}&rdquo; &rarr;
                  </Link>
                </>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  No products found matching &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Wishlist Button */}
          <Link
            href="/wishlist"
            className="relative p-2 text-slate-300 hover:text-rose-400 transition-colors duration-200"
            title="My Wishlist"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            {wishlistIds.size > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white shadow-md">
                {wishlistIds.size}
              </span>
            )}
          </Link>

          {/* Cart Icon */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-slate-300 hover:text-white transition-colors duration-200"
            title="Cart"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {cart && cart.totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[9px] font-extrabold text-white shadow-lg">
                {cart.totalItems}
              </span>
            )}
          </button>

          {/* User Profile / Auth */}
          {isSignedIn ? (
            <div className="flex items-center gap-3 ml-1">
              <Link href="/profile" className="text-xs font-semibold text-slate-300 hover:text-white transition-colors hidden sm:block">
                {user?.firstName || 'Account'}
              </Link>
              {user?.publicMetadata?.role === 'ADMIN' && (
                <Link href="/admin" className="rounded-lg bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-400 hover:bg-violet-500/20 border border-violet-500/20">
                  Admin
                </Link>
              )}
              <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-7 h-7 rounded-full border border-slate-700' } }} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <SignInButton mode="modal">
                <button className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 transition-colors">
                  Sign in
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow hover:bg-slate-100 transition-all">
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
