'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { api } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState<any>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await api.get(`/products/${id}`);
        setProduct(data);
        if (data.images && data.images.length > 0) {
          setActiveImage(data.images[0].url);
        } else {
          setActiveImage('https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop');
        }
      } catch (err: any) {
        setError(err.message || 'Product not found');
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-slate-950">
          <p className="text-slate-400 animate-pulse">Loading product specifications...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-6">
          <h2 className="text-xl font-bold text-red-400 mb-4">{error || 'Product not found'}</h2>
          <button
            onClick={() => router.push('/products')}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Back to Marketplace
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  const originalPrice = parseFloat(product.price.toString());
  const discountPercentage = parseFloat(product.discount?.toString() || '0');
  const hasDiscount = discountPercentage > 0;
  const finalPrice = hasDiscount ? originalPrice * (1 - discountPercentage / 100) : originalPrice;

  const handleAddToCart = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setAdding(true);
    setSuccess(false);
    try {
      await addToCart(product.id, quantity);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to add items to cart');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Image Gallery */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="aspect-square overflow-hidden rounded-2xl border border-slate-900 bg-slate-900/20">
                <img
                  src={activeImage}
                  alt={product.name}
                  className="h-full w-full object-cover object-center transition-all duration-300"
                />
              </div>

              {/* Thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {product.images.map((img: any) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImage(img.url)}
                      className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                        activeImage === img.url ? 'border-violet-500 bg-violet-500/10' : 'border-slate-900 hover:border-slate-800'
                      }`}
                    >
                      <img src={img.url} alt="" className="h-full w-full object-cover object-center" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Meta details */}
            <div className="flex-1 flex flex-col">
              <span className="text-sm font-bold uppercase tracking-wider text-violet-400">
                {product.category.name}
              </span>
              <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                {product.name}
              </h1>

              {/* Pricing section */}
              <div className="mt-6 flex items-center gap-4">
                {hasDiscount ? (
                  <>
                    <span className="text-2xl font-extrabold text-white">
                      ${finalPrice.toFixed(2)}
                    </span>
                    <span className="text-lg text-slate-500 line-through">
                      ${originalPrice.toFixed(2)}
                    </span>
                    <span className="rounded-md bg-violet-650 px-2.5 py-1 text-xs font-bold text-violet-400 border border-violet-500/20">
                      Save {discountPercentage}%
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-extrabold text-white">
                    ${originalPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="mt-8 border-t border-slate-900 pt-8">
                <h3 className="text-sm font-bold text-slate-300">Description</h3>
                <p className="mt-3 text-base text-slate-400 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Stock availability */}
              <div className="mt-8 flex items-center gap-2 text-sm">
                <span className="text-slate-500">Availability:</span>
                {product.stock > 0 ? (
                  <span className="font-semibold text-emerald-400">
                    {product.stock} items in stock
                  </span>
                ) : (
                  <span className="font-semibold text-red-400">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Add to cart panel */}
              {product.stock > 0 && (
                <div className="mt-8 border-t border-slate-900 pt-8 flex flex-col sm:flex-row items-center gap-6">
                  {/* Quantity selector */}
                  <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900">
                    <button
                      onClick={() => setQuantity((q) => Math.max(q - 1, 1))}
                      disabled={quantity <= 1}
                      className="px-4 py-3 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                      </svg>
                    </button>
                    <span className="w-12 text-center text-sm font-bold text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(q + 1, product.stock))}
                      disabled={quantity >= product.stock}
                      className="px-4 py-3 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  </div>

                  {/* Add button */}
                  <button
                    onClick={handleAddToCart}
                    disabled={adding}
                    className={`w-full sm:flex-1 rounded-xl py-3.5 px-6 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:shadow-violet-500/10 ${
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
