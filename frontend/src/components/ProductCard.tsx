'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/currency';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);

  const isLiked = isInWishlist(product.id);

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product.id);
  };

  const originalPrice = parseFloat(product.basePrice.toString());
  const discountAmount = parseFloat(product.discountPrice?.toString() || '0');
  const hasDiscount = discountAmount > 0;
  const finalPrice = hasDiscount ? originalPrice - discountAmount : originalPrice;

  // Enforce total product stock from variants
  const totalStock = product.variants && product.variants.length > 0
    ? product.variants.reduce((acc, v) => acc + v.stock, 0)
    : (product as any).stock || 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Redirect to detail page if product has size/color variants
    if (product.variants && product.variants.length > 0) {
      router.push(`/products/${product.id}`);
      return;
    }

    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    setAdding(true);
    setErrorMsg('');
    try {
      await addToCart(product.id, null, 1);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      const error = err as Error;
      setErrorMsg(error.message || 'Failed to add item');
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setAdding(false);
    }
  };

  const imageUrl = product.images.length > 0
    ? product.images[0].url
    : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop';

  return (
    <Link href={`/products/${product.id}`} className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/50 p-4 transition-all duration-300 hover:border-secondary hover:bg-surface hover:shadow-xl hover:-translate-y-1 hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-bg-base">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          onLoad={() => setImgLoaded(true)}
          className={`object-cover object-center transition-all duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}`}
        />

        {/* Wishlist Heart Button */}
        <button
          onClick={handleWishlistToggle}
          title={isLiked ? 'Remove from Wishlist' : 'Add to Wishlist'}
          className={`absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 active:scale-[0.85] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary ${
            isLiked
              ? 'bg-rose-500/90 text-white shadow-lg shadow-rose-500/30 scale-110'
              : 'bg-surface/80 text-text-muted hover:bg-rose-500 hover:text-white hover:scale-110'
          }`}
        >
          <svg
            className="h-4 w-4"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>

        {hasDiscount && (
          <span className="absolute top-2 left-2 rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-bg-base shadow-md">
            Save {formatCurrency(discountAmount)}
          </span>
        )}
        {totalStock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm">
            <span className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-bold uppercase tracking-wider text-text-muted">
              Out Of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="mt-4 flex flex-1 flex-col">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
          {product.category?.name || 'Catalog'}
        </span>
        <h3 className="mt-1 text-base font-bold text-text-main group-hover:text-primary transition-colors duration-200 line-clamp-1">
          {product.name}
        </h3>
        <p className="mt-1 text-sm text-text-muted line-clamp-2 flex-1">
          {product.description}
        </p>

        {/* Pricing & Add To Cart Button */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-col">
            {hasDiscount ? (
              <>
                <span className="text-xs text-text-muted line-through">
                  {formatCurrency(originalPrice)}
                </span>
                <span className="text-lg font-extrabold text-text-main">
                  {formatCurrency(finalPrice)}
                </span>
              </>
            ) : (
              <span className="text-lg font-extrabold text-text-main">
                {formatCurrency(originalPrice)}
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={totalStock <= 0 || adding}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 shadow-md active:scale-[0.9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base ${
              success
                ? 'bg-emerald-500 text-white'
                : errorMsg
                ? 'bg-rose-500 text-white'
                : totalStock <= 0
                ? 'bg-bg-base text-text-muted cursor-not-allowed opacity-50'
                : 'bg-surface border border-border text-text-main hover:bg-primary hover:text-bg-base hover:border-primary hover:shadow-primary/20 group-hover:bg-primary/10'
            }`}
          >
            {adding ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : success ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : errorMsg ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            ) : product.variants && product.variants.length > 0 ? (
              // Option settings selector icon
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
            ) : (
              // Standard plus add icon
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
          </button>
        </div>

        {errorMsg && (
          <p className="mt-1 text-[10px] font-medium text-rose-400 text-center animate-pulse">
            {errorMsg}
          </p>
        )}
      </div>
    </Link>
  );
}
