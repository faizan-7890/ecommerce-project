'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { api } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import Image from 'next/image';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [product, setProduct] = useState<any>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Variants State
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  // Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isVerifiedBuyer, setIsVerifiedBuyer] = useState(false);

  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load Product and Reviews
  const loadProductAndReviews = async () => {
    if (!id) return;
    try {
      const data = await api.get(`/products/${id}`);
      setProduct(data);
      if (data.images && data.images.length > 0) {
        setActiveImage(data.images[0].url);
      } else {
        setActiveImage('https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop');
      }

      // Pre-select first variant options if available
      if (data.variants && data.variants.length > 0) {
        const firstVariant = data.variants.find((v: any) => v.stock > 0) || data.variants[0];
        setSelectedSize(firstVariant.size || '');
        setSelectedColor(firstVariant.color || '');
        setSelectedVariant(firstVariant);
      }

      // Fetch Reviews
      const reviewsData = await api.get(`/reviews/${data.id}`);
      setReviews(reviewsData);

      // Verify if current user is a verified buyer (backend field is orderStatus)
      if (user) {
        const userOrders = (await api.get('/orders')) as Array<{
          orderStatus: string;
          items: Array<{ productId: number }>;
        }>;
        const hasDeliveredItem = userOrders.some(
          (o) =>
            o.orderStatus === 'delivered' &&
            o.items.some((item) => item.productId === data.id)
        );
        setIsVerifiedBuyer(hasDeliveredItem);
      }
    } catch (err: any) {
      setError(err.message || 'Product not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductAndReviews();
  }, [id, user]);

  // Handle Size/Color changes to select corresponding variant
  useEffect(() => {
    if (!product || !product.variants || product.variants.length === 0) return;

    const matched = product.variants.find((v: any) => {
      const sizeMatch = !v.size || v.size === selectedSize;
      const colorMatch = !v.color || v.color === selectedColor;
      return sizeMatch && colorMatch;
    });

    setSelectedVariant(matched || null);
    setQuantity(1); // Reset quantity bounds on variant change
  }, [selectedSize, selectedColor, product]);

  const handleAddToCart = async () => {
    if (!user) {
      router.push('/login');
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
      const error = err as Error;
      addToast(error.message || 'Failed to add items to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  // Submit Review Handler
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const updatedReviews = await api.get(`/reviews/${product.id}`);
      setReviews(updatedReviews);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 animate-pulse">Loading specifications...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <h2 className="text-xl font-bold text-red-400 mb-4">{error || 'Product not found'}</h2>
          <button
            onClick={() => router.push('/products')}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
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
    ? parseFloat(selectedVariant.price)
    : parseFloat(product.basePrice.toString());
  const discountVal = parseFloat(product.discountPrice?.toString() || '0');
  const hasDiscount = discountVal > 0;
  const finalPrice = hasDiscount ? basePrice - discountVal : basePrice;

  // Enforce stock bounds
  const stockAvailable = selectedVariant ? selectedVariant.stock : product.stock;

  // Extract unique sizes and colors for selections
  const sizes = Array.from(new Set(product.variants.map((v: any) => v.size).filter(Boolean)));
  const colors = Array.from(new Set(product.variants.map((v: any) => v.color).filter(Boolean)));

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Gallery Section */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-900 bg-slate-900/20">
                <Image
                  src={activeImage}
                  alt={product.name}
                  fill
                  className="object-cover object-center"
                />
              </div>
              {product.images && product.images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {product.images.map((img: any) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImage(img.url)}
                      className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                        activeImage === img.url ? 'border-violet-500 bg-violet-500/10' : 'border-slate-900'
                      }`}
                    >
                      <Image src={img.url} alt="" fill className="object-cover object-center" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Config metadata Details */}
            <div className="flex-1 flex flex-col">
              <span className="text-sm font-bold uppercase tracking-wider text-violet-400">
                {product.category?.name || 'Catalog'}
              </span>
              <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl text-white">
                {product.name}
              </h1>
              <p className="text-xs text-slate-500 mt-1">Brand: {product.brand}</p>

              {/* Pricing details */}
              <div className="mt-6 flex items-center gap-4">
                {hasDiscount ? (
                  <>
                    <span className="text-2xl font-extrabold text-white">
                      ${finalPrice.toFixed(2)}
                    </span>
                    <span className="text-lg text-slate-500 line-through">
                      ${basePrice.toFixed(2)}
                    </span>
                    <span className="rounded-md bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-400 border border-violet-500/20">
                      Save ${discountVal.toFixed(0)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-extrabold text-white">
                    ${basePrice.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Variants Selection buttons */}
              {product.variants && product.variants.length > 0 && (
                <div className="mt-8 space-y-6 border-t border-slate-900 pt-8">
                  {/* Colors */}
                  {colors.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Color</h3>
                      <div className="flex flex-wrap gap-3">
                        {colors.map((color: any) => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`rounded-lg border px-4 py-2 text-xs font-bold transition-all ${
                              selectedColor === color
                                ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                                : 'border-slate-850 bg-slate-950 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sizes */}
                  {sizes.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Size</h3>
                      <div className="flex flex-wrap gap-3">
                        {sizes.map((size: any) => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`rounded-lg border px-4 py-2 text-xs font-bold transition-all ${
                              selectedSize === size
                                ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                                : 'border-slate-850 bg-slate-950 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description specs */}
              <div className="mt-8 border-t border-slate-900 pt-8">
                <h3 className="text-sm font-bold text-slate-300">Description</h3>
                <p className="mt-3 text-base text-slate-400 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Stock controls */}
              <div className="mt-8 flex items-center gap-2 text-sm">
                <span className="text-slate-500">Availability:</span>
                {stockAvailable > 0 ? (
                  <span className="font-semibold text-emerald-450">
                    {stockAvailable} items available {selectedVariant ? `(SKU: ${selectedVariant.sku})` : ''}
                  </span>
                ) : (
                  <span className="font-semibold text-red-400">
                    Out of Stock
                  </span>
                )}
              </div>

              {stockAvailable > 0 && (
                <div className="mt-8 border-t border-slate-900 pt-8 flex flex-col sm:flex-row items-center gap-6">
                  {/* Qty increment */}
                  <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900">
                    <button
                      onClick={() => setQuantity((q) => Math.max(q - 1, 1))}
                      disabled={quantity <= 1}
                      className="px-4 py-3 text-slate-400 hover:text-white"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-sm font-bold text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(q + 1, stockAvailable))}
                      disabled={quantity >= stockAvailable}
                      className="px-4 py-3 text-slate-400 hover:text-white"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    disabled={adding}
                    className={`w-full sm:flex-1 rounded-xl py-3.5 px-6 text-sm font-bold text-white shadow-xl transition-all duration-300 ${
                      success
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-95'
                    }`}
                  >
                    {adding ? 'Adding to Cart...' : success ? 'Added!' : 'Add to Shopping Cart'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Reviews & Ratings Section */}
          <div className="mt-16 border-t border-slate-900 pt-16">
            <h2 className="text-2xl font-extrabold text-white mb-8">Customer Reviews</h2>

            <div className="flex flex-col lg:flex-row gap-12">
              {/* Review Form */}
              <div className="flex-1 max-w-md">
                {isVerifiedBuyer ? (
                  <form onSubmit={handleReviewSubmit} className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 space-y-4">
                    <h3 className="text-lg font-bold text-white">Write a Review</h3>
                    <p className="text-xs text-slate-500">You are a verified buyer of this product.</p>

                    {reviewError && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                        {reviewError}
                      </div>
                    )}
                    {reviewSuccess && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-450">
                        {reviewSuccess}
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-450 block mb-2">Rating</label>
                      <select
                        value={rating}
                        onChange={(e) => setRating(parseInt(e.target.value))}
                        className="w-full rounded-xl border border-slate-850 bg-slate-950 px-3 py-2 text-sm text-slate-350 focus:outline-none"
                      >
                        <option value="5">5 Stars - Excellent</option>
                        <option value="4">4 Stars - Very Good</option>
                        <option value="3">3 Stars - Good</option>
                        <option value="2">2 Stars - Fair</option>
                        <option value="1">1 Star - Poor</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-450 block mb-2">Comment</label>
                      <textarea
                        required
                        placeholder="Share your experience with this product..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full rounded-xl border border-slate-850 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 focus:outline-none h-24 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-3 text-xs font-bold text-white transition-colors"
                    >
                      Submit Review
                    </button>
                  </form>
                ) : (
                  <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 text-center text-sm text-slate-500">
                    <p>Only verified customers who have purchased and received this product are eligible to write a review.</p>
                  </div>
                )}
              </div>

              {/* Reviews List */}
              <div className="flex-1 space-y-6">
                {reviews.length > 0 ? (
                  reviews.map((rev) => (
                    <div key={rev.id} className="border-b border-slate-900 pb-6 last:border-b-0 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-white">{rev.user.name}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(rev.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      
                      {/* Star rating rendering */}
                      <div className="flex items-center text-amber-400 gap-0.5">
                        {[...Array(rev.rating)].map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                        {[...Array(5 - rev.rating)].map((_, i) => (
                          <span key={i} className="text-slate-700">★</span>
                        ))}
                      </div>

                      <p className="text-sm text-slate-400 leading-relaxed">{rev.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center rounded-2xl border border-dashed border-slate-850 bg-slate-900/10 text-slate-500 text-sm">
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
