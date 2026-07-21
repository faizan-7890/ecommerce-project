'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { formatCurrency } from '@/lib/currency';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, loading } = useCart();
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { addToast } = useToast();

  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, isLoaded, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 animate-pulse">Redirecting to login...</p>
        </main>
        <Footer />
      </div>
    );
  }

  const handleQtyChange = async (itemId: number, targetQty: number, maxStock: number) => {
    if (targetQty <= 0) {
      try {
        await removeFromCart(itemId);
      } catch (err: any) {
        addToast(err.message || 'Failed to remove item', 'error');
      }
      return;
    }
    if (targetQty > maxStock) {
      addToast(`Cannot exceed available stock of ${maxStock}`, 'error');
      return;
    }
    try {
      await updateQuantity(itemId, targetQty);
    } catch (err: any) {
      addToast(err.message || 'Failed to update quantity', 'error');
    }
  };

  // CartOut returns nested product/variant objects
  const items: any[] = cart?.items ?? [];

  const subtotal = items.reduce((acc, item) => {
    const base = item.variant?.price != null
      ? parseFloat(String(item.variant.price))
      : parseFloat(String(item.product?.basePrice ?? 0));
    const discount = parseFloat(String(item.product?.discountPrice ?? 0));
    const finalPrice = Math.max(base - discount, 0);
    return acc + finalPrice * item.quantity;
  }, 0);

  const shippingFee = subtotal >= 100 ? 0 : 10;
  const taxAmount = subtotal * 0.08;
  const total = subtotal + shippingFee + taxAmount;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-extrabold text-white mb-8">Shopping Cart</h1>

          {items.length > 0 ? (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Items List */}
              <div className="flex-1 space-y-4">
                {items.map((item) => {
                  const base = item.variant?.price != null
                    ? parseFloat(String(item.variant.price))
                    : parseFloat(String(item.product?.basePrice ?? 0));
                  const discount = parseFloat(String(item.product?.discountPrice ?? 0));
                  const finalUnitPrice = Math.max(base - discount, 0);
                  const hasDiscount = discount > 0;
                  const imageUrl = item.product?.images?.[0]?.url
                    || 'https://placehold.co/200x200/1e293b/94a3b8?text=Product';
                  const maxStock = item.variant?.stock ?? 9999;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-900 bg-slate-900/40 p-4 gap-4"
                    >
                      <div className="flex items-center gap-4">
                        {/* Product Thumbnail */}
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-950">
                          <Image
                            src={imageUrl}
                            alt={item.product?.name ?? 'Product'}
                            fill
                            className="object-cover object-center"
                          />
                        </div>

                        {/* Product Details */}
                        <div>
                          <Link
                            href={`/products/${item.productId ?? item.product?.id}`}
                            className="font-bold text-white hover:text-violet-400 transition-colors"
                          >
                            {item.product?.name ?? 'Product'}
                          </Link>

                          {(item.variant?.size || item.variant?.color) && (
                            <div className="mt-0.5 text-xs text-slate-500">
                              {item.variant.size && (
                                <>Size: <span className="text-slate-400 mr-2">{item.variant.size}</span></>
                              )}
                              {item.variant.color && (
                                <>Color: <span className="text-slate-400">{item.variant.color}</span></>
                              )}
                            </div>
                          )}

                          <div className="mt-1.5 flex items-center gap-2 text-xs">
                            {hasDiscount ? (
                              <>
                                <span className="font-semibold text-white">{formatCurrency(finalUnitPrice)}</span>
                                <span className="text-slate-500 line-through">{formatCurrency(base)}</span>
                              </>
                            ) : (
                              <span className="text-slate-400">{formatCurrency(base)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantity & Controls */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-slate-900 pt-4 sm:pt-0">
                        <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950">
                          <button
                            onClick={() => handleQtyChange(item.id, item.quantity - 1, maxStock)}
                            className="px-3 py-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                            disabled={loading || item.quantity <= 1}
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-white">{item.quantity}</span>
                          <button
                            onClick={() => handleQtyChange(item.id, item.quantity + 1, maxStock)}
                            className="px-3 py-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                            disabled={loading}
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="block text-sm font-bold text-white">
                            {formatCurrency(finalUnitPrice * item.quantity)}
                          </span>
                          <button
                            onClick={() => handleQtyChange(item.id, 0, maxStock)}
                            className="mt-1 text-xs font-medium text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            disabled={loading}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className="w-full lg:w-80 flex-shrink-0">
                <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
                  <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Order Summary</h2>

                  <div className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                      <span className="text-white font-semibold">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Shipping</span>
                      <span className={shippingFee === 0 ? 'text-emerald-400 font-semibold' : 'text-white font-semibold'}>
                        {shippingFee === 0 ? 'Free' : formatCurrency(shippingFee)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Tax (8%)</span>
                      <span className="text-white font-semibold">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-3 text-base font-bold text-white">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/checkout')}
                    disabled={loading}
                    className="mt-8 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-center text-sm font-bold text-white shadow-xl shadow-violet-500/10 hover:opacity-95 transition-opacity disabled:opacity-60"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-slate-400">
              <p className="mb-6">Your shopping cart is empty.</p>
              <Link
                href="/products"
                className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md"
              >
                Browse Products
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
