'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, loading } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user]);

  if (!user) {
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

  const handleQtyChange = async (itemId: number, currentQty: number, targetQty: number, stock: number) => {
    if (targetQty <= 0) {
      await removeFromCart(itemId);
      return;
    }
    if (targetQty > stock) {
      alert(`Cannot exceed available stock of ${stock}`);
      return;
    }
    try {
      await updateQuantity(itemId, targetQty);
    } catch (err: any) {
      alert(err.message || 'Failed to update quantity');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-extrabold text-white mb-8">Shopping Cart</h1>

          {cart && cart.items.length > 0 ? (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Items List */}
              <div className="flex-1 space-y-4">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-900 bg-slate-900/40 p-4 gap-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* Product Thumbnail */}
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-950">
                        <img
                          src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200&auto=format&fit=crop'}
                          alt={item.name}
                          className="h-full w-full object-cover object-center"
                        />
                      </div>

                      {/* Product Details */}
                      <div>
                        <Link href={`/products/${item.productId}`} className="font-bold text-white hover:text-violet-400 transition-colors">
                          {item.name}
                        </Link>
                        
                        {/* Variant Attributes details */}
                        {item.size || item.color ? (
                          <div className="mt-0.5 text-xs text-slate-500">
                            Size: <span className="text-slate-400 mr-2">{item.size || 'N/A'}</span>
                            Color: <span className="text-slate-400">{item.color || 'N/A'}</span>
                          </div>
                        ) : null}

                        <div className="mt-1.5 flex items-center gap-2 text-xs">
                          {item.discount > 0 ? (
                            <>
                              <span className="font-semibold text-white">${item.finalUnitPrice.toFixed(2)}</span>
                              <span className="text-slate-500 line-through">${item.basePrice.toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="text-slate-400">${item.basePrice.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-slate-900 pt-4 sm:pt-0">
                      <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950">
                        <button
                          onClick={() => handleQtyChange(item.id, item.quantity, item.quantity - 1, item.stock)}
                          className="px-3 py-1.5 text-slate-400 hover:text-white"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-white">{item.quantity}</span>
                        <button
                          onClick={() => handleQtyChange(item.id, item.quantity, item.quantity + 1, item.stock)}
                          className="px-3 py-1.5 text-slate-400 hover:text-white"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="block text-sm font-bold text-white">${item.subtotal.toFixed(2)}</span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="mt-1 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="w-full lg:w-80 flex-shrink-0">
                <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
                  <h2 className="text-lg font-bold text-white border-b border-slate-850 pb-4">Order Summary</h2>

                  <div className="mt-6 space-y-4 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Total Items</span>
                      <span className="text-white font-semibold">{cart.totalItems}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-850 pt-4 text-base font-bold text-white">
                      <span>Subtotal</span>
                      <span>${cart.subtotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/checkout')}
                    disabled={loading}
                    className="mt-8 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-center text-sm font-bold text-white shadow-xl shadow-violet-500/10 hover:opacity-95 transition-opacity"
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
