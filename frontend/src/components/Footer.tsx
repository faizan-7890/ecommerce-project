import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative mt-auto border-t border-border bg-bg-base py-8 text-center text-sm text-text-muted">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p>© {new Date().getFullYear()} VELOCE. All rights reserved.</p>
          <div className="flex gap-6">
            <Link
              href="/products"
              className="transition-colors hover:text-primary"
            >
              Shop
            </Link>
            <Link
              href="/privacy-policy"
              className="transition-colors hover:text-primary"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-primary"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
