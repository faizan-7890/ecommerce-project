'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface Address {
  id: number;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressType: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const { cart, refreshCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  // Address State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // New Address Card State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  // Promo Code State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('cod'); // "cod" or "card"
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Checkout Actions State
  const [loading, setLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAddresses = async () => {
    try {
      const data = await api.get('/users/addresses');
      setAddresses(data);
      if (data.length > 0) {
        const defaultAddr = data.find((a: Address) => a.isDefault) || data[0];
        setSelectedAddressId(defaultAddr.id);
      } else {
        setShowAddressForm(true);
      }
    } catch (err) {
      console.error('Failed to load address book:', err);
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (cart && cart.items.length === 0) {
      router.push('/cart');
      return;
    }
    loadAddresses();
  }, [user, cart]);

  if (!user || !cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Loading checkout requirements...</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Handle coupon validation
  const handleApplyCoupon = async (e: React.MouseEvent) => {
    e.preventDefault();
    setCouponError('');
    setAppliedCoupon(null);

    if (!couponCode) return;

    try {
      const data = await api.post('/coupons/validate', {
        code: couponCode,
        subtotal: cart.subtotal,
      });
      setAppliedCoupon(data);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid promo code');
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !phoneNumber || !addressLine1 || !city || !state || !postalCode || !country) {
      setError('Please fill in all address book fields');
      return;
    }

    setLoading(true);
    try {
      const newAddr = await api.post('/users/addresses', {
        fullName,
        phoneNumber,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        postalCode,
        country,
        addressType: 'shipping',
        isDefault: addresses.length === 0,
      });

      setAddresses((prev) => [...prev, newAddr]);
      setSelectedAddressId(newAddr.id);
      setShowAddressForm(false);

      // Clear input fields
      setFullName('');
      setPhoneNumber('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setPostalCode('');
      setCountry('');
    } catch (err: any) {
      setError(err.message || 'Failed to register address card');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedAddressId) {
      setError('Please select or register a shipping address first');
      return;
    }

    setLoading(true);
    try {
      // Generate unique idempotency key
      const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 1. Place order
      const order = await api.post('/orders', {
        shippingAddressId: selectedAddressId,
        billingAddressId: selectedAddressId,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        paymentMethod,
      }, {
        'x-idempotency-key': idempotencyKey,
      });

      // 2. Redirect to Stripe Checkout Session
      if (paymentMethod === 'card') {
        const paymentRes = await api.post('/payments/create', {
          orderId: order.id,
        });

        if (paymentRes.checkoutUrl) {
          window.location.href = paymentRes.checkoutUrl;
          return;
        }
      }

      await refreshCart();
      router.push('/orders');
    } catch (err: any) {
      setError(err.message || 'Checkout failed. Please inspect your item stock settings.');
    } finally {
      setLoading(false);
    }
  };

  // Re-calculate checkout summaries
  const subtotal = cart.subtotal;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const taxableSubtotal = Math.max(subtotal - discountAmount, 0);
  const taxAmount = taxableSubtotal * 0.08;
  const shippingAmount = taxableSubtotal >= 100 || taxableSubtotal === 0 ? 0 : 10;
  const finalTotal = taxableSubtotal + taxAmount + shippingAmount;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-extrabold text-white mb-8">Checkout Details</h1>

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Column: Address selection and payments */}
            <div className="flex-1 space-y-6">
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Shipping Address Selection */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Shipping Address</h2>
                  {addresses.length > 0 && (
                    <button
                      onClick={() => setShowAddressForm(!showAddressForm)}
                      className="text-xs font-bold text-violet-400 hover:text-violet-300"
                    >
                      {showAddressForm ? 'Select Saved Address' : 'Register New Address'}
                    </button>
                  )}
                </div>

                {addressLoading ? (
                  <p className="text-slate-500 text-sm animate-pulse">Loading address list...</p>
                ) : showAddressForm ? (
                  /* Create New Address Card Inline */
                  <form onSubmit={handleCreateAddress} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400">Full Name</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400">Phone Number</label>
                        <input
                          type="text"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400">Address Line 1</label>
                      <input
                        type="text"
                        required
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400">Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400">City</label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400">State</label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400">Zip Code</label>
                        <input
                          type="text"
                          required
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400">Country</label>
                        <input
                          type="text"
                          required
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="rounded-lg bg-violet-650 hover:bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition-colors"
                    >
                      Save and Use This Address
                    </button>
                  </form>
                ) : (
                  /* Saved Address Selection Cards */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`text-left p-4 rounded-xl border flex flex-col transition-all ${
                          selectedAddressId === addr.id
                            ? 'border-violet-500 bg-violet-500/5'
                            : 'border-slate-900 bg-slate-950/40 hover:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-white">{addr.fullName}</span>
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[9px] uppercase font-bold text-slate-400">
                            {addr.addressType}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                          <p>{addr.addressLine1}</p>
                          <p>{addr.city}, {addr.state} {addr.postalCode}</p>
                          <p>Phone: {addr.phoneNumber}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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
                      <span className="block font-bold text-white text-sm">Cash On Delivery</span>
                      <span className="text-xs text-slate-500">Pay on parcel delivery</span>
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
                      <span className="block font-bold text-white text-sm">Mock Credit Card</span>
                      <span className="text-xs text-slate-500">Stripe/PayPal simulated capture</span>
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

                {/* Secure Stripe Checkout Information Box */}
                {paymentMethod === 'card' && (
                  <div className="mt-6 border-t border-slate-900 pt-6 space-y-3 animate-fadeIn text-xs text-slate-400">
                    <div className="flex items-center gap-2 text-violet-400 font-bold uppercase tracking-wider">
                      <span className="text-lg">💳</span>
                      <span>Stripe Secure Gateway</span>
                    </div>
                    <p className="leading-relaxed">
                      You will be securely redirected to Stripe Checkout to enter your payment details. No credit card information will be processed or stored on our servers.
                    </p>
                    <div className="flex gap-2.5 items-center mt-2 rounded-xl bg-violet-500/5 border border-violet-500/10 p-3">
                      <span className="text-violet-400 font-bold">✓</span>
                      <span>PCI-DSS Compliant Encryption</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Checkout item details and pricing summaries */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm sticky top-6">
                <h2 className="text-lg font-bold text-white border-b border-slate-850 pb-4">Order Items</h2>

                <div className="mt-6 max-h-48 overflow-y-auto space-y-3 pr-2 border-b border-slate-900 pb-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs">
                      <div className="flex flex-col flex-1 pr-2">
                        <span className="text-slate-350 line-clamp-1 font-medium">{item.name}</span>
                        {item.size || item.color ? (
                          <span className="text-[10px] text-slate-500">
                            Options: {item.size || ''} {item.color || ''}
                          </span>
                        ) : null}
                        <span className="text-[10px] text-slate-500">Qty: {item.quantity}</span>
                      </div>
                      <span className="text-white font-bold">${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Promo Code Coupon Application */}
                <div className="mt-6 border-b border-slate-900 pb-6 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450">Discount Code</h3>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="WELCOME10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-xs focus:outline-none text-slate-200 uppercase"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="rounded-lg bg-slate-800 hover:bg-slate-750 px-3 text-xs font-bold text-white"
                    >
                      Apply
                    </button>
                  </div>

                  {couponError && <p className="text-[10px] text-red-400 font-semibold">{couponError}</p>}
                  {appliedCoupon && (
                    <p className="text-[10px] text-emerald-450 font-bold">
                      Code applied: {appliedCoupon.code} (-${appliedCoupon.discountAmount.toFixed(2)})
                    </p>
                  )}
                </div>

                {/* Checkout Summary Figures */}
                <div className="mt-6 space-y-4 text-xs font-semibold">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-violet-400">
                      <span>Discount</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Sales Tax (8%)</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Shipping Fee</span>
                    {shippingAmount === 0 ? (
                      <span className="text-emerald-450">FREE</span>
                    ) : (
                      <span>${shippingAmount.toFixed(2)}</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between border-t border-slate-850 pt-4 text-base font-extrabold text-white">
                    <span>Grand Total</span>
                    <span>${finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className="mt-8 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-center text-sm font-bold text-white shadow-xl shadow-violet-500/15 hover:opacity-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Authorizing Checkout...' : 'Place Order'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
