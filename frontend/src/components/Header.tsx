'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import MiniCart from '@/components/MiniCart';

export default function Header() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center space-x-2">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-500 to-pink-500 bg-clip-text text-2xl font-black tracking-wider text-transparent transition-transform duration-300 group-hover:scale-105">
              VELOCE
            </span>
          </Link>

          {/* Main Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/products"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
            >
              Shop All
            </Link>
          </nav>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {/* Cart Icon */}
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-slate-300 hover:text-white transition-colors duration-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            {cart && cart.totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[10px] font-bold text-white shadow-lg ring-1 ring-slate-950 animate-bounce-short">
                {cart.totalItems}
              </span>
            )}
          </button>

          {/* User Links */}
          {user ? (
            <div className="flex items-center gap-4">
              {user.role === 'ADMIN' ? (
                <Link
                  href="/admin"
                  className="rounded-full bg-slate-800 px-4 py-1.5 text-xs font-semibold text-violet-400 border border-violet-500/20 hover:bg-slate-700 transition-all duration-200"
                >
                  Admin Panel
                </Link>
              ) : (
                <Link
                  href="/profile"
                  className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
                >
                  My Profile
                </Link>
              )}
              <button
                onClick={logout}
                className="text-sm font-medium text-slate-400 hover:text-red-400 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/20 hover:opacity-90 transition-all duration-200"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
      <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}
