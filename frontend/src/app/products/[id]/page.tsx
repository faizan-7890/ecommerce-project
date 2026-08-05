'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { api } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/context/ToastContext';
import Image from 'next/image';
import { formatCurrency } from '@/lib/currency';
import { AnimatePresence, motion } from 'framer-motion';
import { FadeIn, MagneticButton, Pressable } from '@/components/motion';
import { cn } from '@/lib/cn';
import type { Product, ProductImage, ProductVariant, Review } from '@/types';
import { getErrorMessage } from '@/lib/errors';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { isSignedIn } = useUser();
  const { addToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Variants State
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isVerifiedBuyer, setIsVerifiedBuyer] = useState(false);

  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load Product and Reviews
  const loadProductAndReviews = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get<Product>(`/products/${id}`);
      setProduct(data);
      if (data.images && data.images.length > 0) {
        setActiveImage(data.images[0].url);
      } else {
        setActiveImage('https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop');
      }

      // Pre-select first variant options if available
      if (data.variants && data.variants.length > 0) {
        const firstVariant = data.variants.find((v) => v.stock > 0) || data.variants[0];
        setSelectedSize(firstVariant.size || '');
        setSelectedColor(firstVariant.color || '');
        setSelectedVariant(firstVariant);
      }

      // Fetch Reviews safely
      try {
        const reviewsData = await api.get<Review[]>(`/reviews/${data.id}`);
        setReviews(reviewsData || []);
      } catch (revErr) {
        console.warn('Could not fetch product reviews:', revErr);
        setReviews([]);
      }

      // Verify if current user is a verified buyer safely
      if (isSignedIn) {
        try {
          const userOrders = (await api.get('/orders')) as Array<{
            orderStatus: string;
            items: Array<{ productId: number }>;
          }>;
          const hasDeliveredItem = Array.isArray(userOrders) && userOrders.some(
            (o) =>
              o.orderStatus === 'delivered' &&
              o.items.some((item) => item.productId === data.id)
          );
          setIsVerifiedBuyer(hasDeliveredItem);
        } catch (ordErr) {
          console.warn('Could not fetch user orders for verification:', ordErr);
        }
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Product not found'));
    } finally {
      setLoading(false);
    }
  }, [id, isSignedIn]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProductAndReviews();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadProductAndReviews]);

  // Handle Size/Color changes to select corresponding variant
  useEffect(() => {
    if (!product || !product.variants || product.variants.length === 0) return;

    const matched = product.variants.find((v) => {
      const sizeMatch = !v.size || v.size === selectedSize;
      const colorMatch = !v.color || v.color === selectedColor;
      return sizeMatch && colorMatch;
    });

    // Option changes are user-driven; keeping this derived lookup in an effect
    // avoids stale variant identifiers after a size/color selection.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedVariant(matched || null);
  }, [selectedSize, selectedColor, product]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      addToast('Selected option is currently unavailable', 'error');
      return;
    }

    setAdding(true);
    setSuccess(false);
    try {
      const variantId = selectedVariant ? selectedVariant.id : null;
      await addToCart(product.id, variantId, quantity);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to add items to cart'), 'error');
    } finally {
      setAdding(false);
    }
  };

  // Submit Review Handler
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setReviewError('');
    setReviewSuccess('');

    try {
      await api.post('/reviews', {
        productId: product.id,
        rating,
        comment,
      });

      setReviewSuccess('Thank you! Your review has been submitted.');
      setComment('');
      setRating(5);
      
      // Reload reviews list
      const updatedReviews = await api.get<Review[]>(`/reviews/${product.id}`);
      setReviews(updatedReviews);
    } catch (err: unknown) {
      setReviewError(getErrorMessage(err, 'Failed to submit review'));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-base">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-7xl px-4">
            <div className="grid gap-12 lg:grid-cols-2">
              <div className="velo-shimmer aspect-square rounded-2xl" />
              <div className="space-y-4">
                <div className="velo-shimmer h-4 w-24 rounded" />
                <div className="velo-shimmer h-10 w-3/4 rounded" />
                <div className="velo-shimmer h-8 w-32 rounded" />
                <div className="velo-shimmer h-24 w-full rounded" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-base">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center p-6">
          <h2 className="mb-4 text-xl font-bold text-danger">{error || 'Product not found'}</h2>
          <button
            onClick={() => router.push('/products')}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-bg-base"
          >
            Back to Marketplace
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  // Determine current display price
  const basePrice = selectedVariant && selectedVariant.price !== null
    ? Number(selectedVariant.price)
    : Number(product.basePrice);
  const discountVal = parseFloat(product.discountPrice?.toString() || '0');
  const hasDiscount = discountVal > 0;
  const finalPrice = hasDiscount ? basePrice - discountVal : basePrice;

  // Enforce stock bounds
  const stockAvailable = selectedVariant?.stock ?? product.variants.reduce((sum, variant) => sum + variant.stock, 0);

  // Extract unique sizes and colors for variant selections
  const sizes = Array.from(new Set(product.variants.map((v) => v.size).filter((value): value is string => Boolean(value))));
  const colors = Array.from(new Set(product.variants.map((v) => v.color).filter((value): value is string => Boolean(value))));

  // Generate Google Schema.org JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images?.map((i) => i.url) || [activeImage],
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Veloce',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: finalPrice,
      availability: stockAvailable > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: typeof window !== 'undefined' ? window.location.href : '',
    },
    ...(reviews.length > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1),
        reviewCount: reviews.length,
      },
    }),
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-base text-text-main">
      {/* Inject Google Schema.org Product Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Gallery Section */}
            <div className="flex flex-1 flex-col gap-4">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface/30">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={activeImage}
                      alt={product.name}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover object-center transition-transform duration-500 hover:scale-105"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
              {product.images && product.images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {product.images.map((img: ProductImage) => (
                    <motion.button
                      key={img.id}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveImage(img.url)}
                      className={cn(
                        'relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                        activeImage === img.url
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                          : 'border-border'
                      )}
                    >
                      <Image src={img.url} alt="" fill sizes="80px" className="object-cover object-center" />
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Config metadata Details */}
            <FadeIn className="flex flex-1 flex-col">
              <span className="text-sm font-bold uppercase tracking-wider text-primary">
                {product.category?.name || 'Catalog'}
              </span>
              <h1 className="mt-2 text-3xl font-extrabold text-text-main sm:text-4xl">
                {product.name}
              </h1>
              <p className="text-xs text-text-muted mt-1">Brand: {product.brand}</p>

              {/* Pricing details */}
              <div className="mt-6 flex items-center gap-4">
                {hasDiscount ? (
                  <>
                    <span className="text-2xl font-extrabold text-text-main">
                      {formatCurrency(finalPrice)}
                    </span>
                    <span className="text-lg text-text-muted line-through">
                      {formatCurrency(basePrice)}
                    </span>
                    <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary border border-primary/20">
                      Save {formatCurrency(discountVal)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-extrabold text-text-main">
                    {formatCurrency(basePrice)}
                  </span>
                )}
              </div>

              {stockAvailable > 0 && stockAvailable <= 5 && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/30 px-3 py-1 text-xs font-bold text-warning animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  Low Stock — Only {stockAvailable} left in stock!
                </div>
              )}

              {/* Variants Selection buttons */}
              {product.variants && product.variants.length > 0 && (
                <div className="mt-8 space-y-6 border-t border-border pt-8">
                  {/* Colors */}
                  {colors.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Color</h3>
                      <div className="flex flex-wrap gap-3">
                        {colors.map((color) => (
                          <motion.button
                            key={color}
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setSelectedColor(color)}
                            className={cn(
                              'rounded-lg border px-4 py-2 text-xs font-bold transition-all',
                              selectedColor === color
                                ? 'scale-105 border-primary bg-primary/10 text-primary ring-1 ring-primary/40'
                                : 'border-border bg-bg-base text-text-muted hover:border-primary/40'
                            )}
                          >
                            {color}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sizes */}
                  {sizes.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Size</h3>
                      <div className="flex flex-wrap gap-3">
                        {sizes.map((size) => (
                          <motion.button
                            key={size}
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setSelectedSize(size)}
                            className={cn(
                              'rounded-lg border px-4 py-2 text-xs font-bold transition-all',
                              selectedSize === size
                                ? 'scale-105 border-primary bg-primary/10 text-primary ring-1 ring-primary/40'
                                : 'border-border bg-bg-base text-text-muted hover:border-primary/40'
                            )}
                          >
                            {size}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description specs */}
              <div className="mt-8 border-t border-border pt-8">
                <h3 className="text-sm font-bold text-text-muted">Description</h3>
                <p className="mt-3 text-base text-text-muted leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Stock controls */}
              <div className="mt-8 flex items-center gap-2 text-sm">
                <span className="text-text-muted">Availability:</span>
                {stockAvailable > 0 ? (
                  <span className="font-semibold text-success">
                    {stockAvailable} items available {selectedVariant ? `(SKU: ${selectedVariant.sku})` : ''}
                  </span>
                ) : (
                  <span className="font-semibold text-danger">
                    Out of Stock
                  </span>
                )}
              </div>

              {stockAvailable > 0 && (
                <div className="mt-8 flex flex-col items-center gap-6 border-t border-border pt-8 sm:flex-row">
                  <div className="flex items-center rounded-xl border border-border bg-surface">
                    <Pressable
                      onClick={() => setQuantity((q) => Math.max(q - 1, 1))}
                      disabled={quantity <= 1}
                      className="px-4 py-3 text-text-muted hover:text-text-main disabled:opacity-40"
                    >
                      -
                    </Pressable>
                    <motion.span
                      key={quantity}
                      initial={{ scale: 0.85, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-12 text-center text-sm font-bold text-text-main"
                    >
                      {quantity}
                    </motion.span>
                    <Pressable
                      onClick={() => setQuantity((q) => Math.min(q + 1, stockAvailable))}
                      disabled={quantity >= stockAvailable}
                      className="px-4 py-3 text-text-muted hover:text-text-main disabled:opacity-40"
                    >
                      +
                    </Pressable>
                  </div>

                  <MagneticButton
                    onClick={handleAddToCart}
                    disabled={adding}
                    className={cn(
                      'w-full sm:flex-1',
                      success && 'bg-success shadow-success/20 hover:brightness-110'
                    )}
                  >
                    {adding ? 'Adding to Cart...' : success ? 'Added ✓' : 'Add to Shopping Cart'}
                  </MagneticButton>
                </div>
              )}
            </FadeIn>
          </div>

          {/* Reviews & Ratings Section */}
          <div className="mt-16 border-t border-border pt-16">
            <h2 className="text-2xl font-extrabold text-text-main mb-8">Customer Reviews</h2>

            <div className="flex flex-col lg:flex-row gap-12">
              {/* Review Form */}
              <div className="flex-1 max-w-md">
                {isVerifiedBuyer ? (
                  <form onSubmit={handleReviewSubmit} className="rounded-2xl border border-border bg-surface/30 p-6 space-y-4">
                    <h3 className="text-lg font-bold text-text-main">Write a Review</h3>
                    <p className="text-xs text-text-muted">You are a verified buyer of this product.</p>

                    {reviewError && (
                      <div className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs text-danger">
                        {reviewError}
                      </div>
                    )}
                    {reviewSuccess && (
                      <div className="rounded-xl border border-success/20 bg-success/10 p-3 text-xs text-success">
                        {reviewSuccess}
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-2">Rating</label>
                      <select
                        value={rating}
                        onChange={(e) => setRating(parseInt(e.target.value))}
                        className="w-full rounded-xl border border-border bg-bg-base px-3 py-2 text-sm text-text-main focus:outline-none"
                      >
                        <option value="5">5 Stars - Excellent</option>
                        <option value="4">4 Stars - Very Good</option>
                        <option value="3">3 Stars - Good</option>
                        <option value="2">2 Stars - Fair</option>
                        <option value="1">1 Star - Poor</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-2">Comment</label>
                      <textarea
                        required
                        placeholder="Share your experience with this product..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full rounded-xl border border-border bg-bg-base px-3 py-2.5 text-sm text-text-main focus:outline-none h-24 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-surface hover:bg-surface py-3 text-xs font-bold text-text-main transition-colors"
                    >
                      Submit Review
                    </button>
                  </form>
                ) : (
                  <div className="rounded-2xl border border-border bg-surface/20 p-6 text-center text-sm text-text-muted">
                    <p>Only verified customers who have purchased and received this product are eligible to write a review.</p>
                  </div>
                )}
              </div>

              {/* Reviews List */}
              <div className="flex-1 space-y-6">
                {reviews.length > 0 ? (
                  reviews.map((rev) => (
                    <div key={rev.id} className="border-b border-border pb-6 last:border-b-0 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-text-main">{rev.user?.name || 'Verified customer'}</span>
                        <span className="text-xs text-text-muted">
                          {new Date(rev.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      
                      {/* Star rating rendering */}
                      <div className="flex items-center text-warning gap-0.5">
                        {[...Array(rev.rating)].map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                        {[...Array(5 - rev.rating)].map((_, i) => (
                          <span key={i} className="text-border">★</span>
                        ))}
                      </div>

                      <p className="text-sm text-text-muted leading-relaxed">{rev.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center rounded-2xl border border-dashed border-border bg-surface/20 text-text-muted text-sm">
                    No reviews submitted for this product yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
