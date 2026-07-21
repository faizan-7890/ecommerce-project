'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { api } from '@/lib/api';
import { useUser } from '@clerk/nextjs';
import { formatCurrency } from '@/lib/currency';

interface OrderItem {
  id: number;
  productId: number;
  productVariantId?: number;
  unitPrice: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    images: { id: number; url: string }[];
  };
  variant?: {
    id: number;
    size?: string;
    color?: string;
    sku?: string;
  };
}

interface OrderDetail {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  shippingAddress?: {
    fullName: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
}

const STEPS = [
  { key: 'PENDING', label: 'Order Placed', desc: 'Order received & pending review' },
  { key: 'PROCESSING', label: 'Processing', desc: 'Item being packed & prepared' },
  { key: 'SHIPPED', label: 'Shipped', desc: 'Package in transit with courier' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Package delivered to address' },
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
      return;
    }

    if (isSignedIn && id) {
      fetchOrderDetails();
    }
  }, [id, isSignedIn, isLoaded, router]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/orders/${id}`);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStepIndex = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'CANCELLED' || s === 'REFUNDED') return -1;
    switch (s) {
      case 'PENDING': return 0;
      case 'PROCESSING': return 1;
      case 'SHIPPED': return 2;
      case 'DELIVERED': return 3;
      default: return 0;
    }
  };

  const currentStep = order ? getStepIndex(order.status) : 0;
  const isCancelled = order?.status.toUpperCase() === 'CANCELLED';

  if (!isLoaded || loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-slate-400">
            <svg className="h-5 w-5 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading order status...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="text-center max-w-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-4 border border-red-500/20">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Order Not Found</h2>
            <p className="text-sm text-slate-400 mb-6">{error || 'We could not find the details for this order.'}</p>
            <Link
              href="/orders"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 px-6 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-850"
            >
              &larr; Back to My Orders
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white print:text-black">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Breadcrumb Navigation & Print Action */}
          <div className="flex items-center justify-between print:hidden">
            <Link href="/orders" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
              &larr; Back to Orders
            </Link>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-850 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.656" />
              </svg>
              Print Invoice
            </button>
          </div>

          {/* Header Card */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-white">Order #{order.orderNumber}</h1>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    isCancelled
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : order.status.toUpperCase() === 'DELIVERED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-medium text-slate-400 block">Total Amount</span>
                <span className="text-2xl font-black text-white">{formatCurrency(parseFloat(order.totalAmount.toString()))}</span>
              </div>
            </div>

            {/* Status Stepper Timeline */}
            {!isCancelled ? (
              <div className="mt-8">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Delivery Progress</h3>
                <div className="relative flex items-center justify-between">
                  {/* Connecting Line */}
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-800 z-0">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-500"
                      style={{ width: `${(Math.max(0, currentStep) / (STEPS.length - 1)) * 100}%` }}
                    />
                  </div>

                  {STEPS.map((step, idx) => {
                    const isPassed = idx <= currentStep;
                    const isCurrent = idx === currentStep;

                    return (
                      <div key={step.key} className="relative z-10 flex flex-col items-center">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                          isPassed
                            ? 'border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-500/40'
                            : 'border-slate-800 bg-slate-950 text-slate-600'
                        }`}>
                          {isPassed ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            <span className="text-xs font-bold">{idx + 1}</span>
                          )}
                        </div>
                        <span className={`mt-2 text-xs font-bold ${isCurrent ? 'text-violet-400' : isPassed ? 'text-white' : 'text-slate-500'}`}>
                          {step.label}
                        </span>
                        <span className="text-[10px] text-slate-500 hidden sm:block text-center max-w-[90px] mt-0.5">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-center text-xs font-semibold text-rose-300">
                This order was cancelled. If you have questions, please contact our support team.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Items List */}
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-white">Order Items ({order.items.length})</h2>
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 divide-y divide-slate-850/60 overflow-hidden">
                {order.items.map((item) => {
                  const img = item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop';
                  const price = parseFloat(item.unitPrice.toString());

                  return (
                    <div key={item.id} className="flex items-center gap-4 p-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-950 flex-shrink-0">
                        <Image src={img} alt={item.product?.name || 'Product'} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white line-clamp-1">{item.product?.name}</h4>
                        {item.variant && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {item.variant.size && `Size: ${item.variant.size}`}
                            {item.variant.color && ` • Color: ${item.variant.color}`}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-white">{formatCurrency(price * item.quantity)}</span>
                        <span className="text-xs text-slate-500 block">{formatCurrency(price)} each</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Address & Payment Info */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
                <h3 className="text-sm font-bold text-white mb-3">Shipping Address</h3>
                {order.shippingAddress ? (
                  <div className="text-xs text-slate-300 space-y-1">
                    <p className="font-bold text-white">{order.shippingAddress.fullName}</p>
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                    <p>{order.shippingAddress.country}</p>
                    <p className="text-slate-400 pt-2 font-mono">{order.shippingAddress.phoneNumber}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Standard Delivery</p>
                )}
              </div>

              {/* Payment Details */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
                <h3 className="text-sm font-bold text-white mb-3">Payment Info</h3>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Method</span>
                    <span className="font-bold text-white uppercase">{order.paymentMethod || 'Razorpay / Card'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status</span>
                    <span className="font-bold text-emerald-400 capitalize">{order.paymentStatus}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
