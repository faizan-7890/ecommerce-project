'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function CheckoutPage() {
  const { cart, refreshCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  // Shipping Address Form State
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  
  // Checkout details state
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (cart && cart.items.length === 0) {
      router.push('/cart');
    }
  }, [user, cart]);

  if (!user || !cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-slate-950">
          <p className="text-slate-400">Loading checkout requirements...</p>
        </main>
        <Footer />
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!street || !city || !state || !zipCode || !country) {
      setError('Please fill in all address fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const order = await api.post('/orders', {
        shippingAddress: { street, city, state, zipCode, country },
        paymentMethod,
      });
      
      // Clean and refresh contexts
      await refreshCart();
      router.push('/orders');
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-extrabold text-white mb-8">Checkout</h1>

          <form onSubmit={handlePlaceOrder} className="flex flex-col lg:flex-row gap-8">
            {/* Form Fields */}
            <div className="flex-1 space-y-6">
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Shipping Form */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-4">Shipping Address</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Street Address</label>
                    <input
                      type="text"
                      required
                      placeholder="123 Luxury Avenue"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">City</label>
                      <input
                        type="text"
                        required
                        placeholder="Beverly Hills"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">State / Region</label>
                      <input
                        type="text"
                        required
                        placeholder="CA"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Zip / Postal Code</label>
                      <input
                        type="text"
                        required
                        placeholder="90210"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Country</label>
                      <input
                        type="text"
                        required
                        placeholder="United States"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white mb-4">Payment Method</h2>
                <div className="grid grid-cols-2 gap-4">
                  <label
                    className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-violet-500 bg-violet-500/5'
                        : 'border-slate-850 hover:border-slate-800 bg-slate-950'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-white">Cash On Delivery</span>
                      <span className="text-xs text-slate-500">Pay when shipped</span>
                    </div>
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="accent-violet-500 h-4 w-4"
                    />
                  </label>

                  <label
                    className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                      paymentMethod === 'card'
                        ? 'border-violet-500 bg-violet-500/5'
                        : 'border-slate-850 hover:border-slate-800 bg-slate-950'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-white">Mock Credit Card</span>
                      <span className="text-xs text-slate-500">Instant validation</span>
                    </div>
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="accent-violet-500 h-4 w-4"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Side summary panel */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white border-b border-slate-850 pb-4">Checkout Items</h2>

                {/* Items preview list */}
                <div className="mt-6 max-h-48 overflow-y-auto space-y-3 pr-2">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-400 line-clamp-1 flex-1 pr-2">
                        {item.name} <span className="text-xs text-slate-600">x{item.quantity}</span>
                      </span>
                      <span className="text-white font-semibold">${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-slate-850 pt-4 space-y-4 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Shipping fee</span>
                    <span className="text-emerald-400 font-semibold">FREE</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-850 pt-4 text-base font-bold text-white">
                    <span>Order Total</span>
                    <span>${cart.subtotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-8 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-center text-sm font-bold text-white shadow-xl shadow-violet-500/10 hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Authorizing Payment...' : 'Complete Checkout'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
