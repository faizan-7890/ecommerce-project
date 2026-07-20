'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import Image from 'next/image';

export default function OrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const data = await api.get('/orders');
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else {
      loadOrders();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-slate-950">
          <p className="text-slate-400">Loading order tracker...</p>
        </main>
        <Footer />
      </div>
    );
  }

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await api.put(`/orders/${orderId}/cancel`);
      addToast('Order cancelled successfully!', 'success');
      loadOrders();
    } catch (err: unknown) {
      const error = err as Error;
      addToast(error.message || 'Failed to cancel order', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl flex flex-col md:flex-row gap-8">
          
          {/* Quick Nav Sidebar */}
          <aside className="w-full md:w-56 flex-shrink-0">
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-4 backdrop-blur-sm">
              <nav className="flex flex-col gap-2 text-sm font-semibold">
                <Link
                  href="/profile"
                  className="rounded-xl px-4 py-2.5 text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                >
                  Account Profile
                </Link>
                <Link
                  href="/orders"
                  className="rounded-xl bg-violet-500/10 px-4 py-2.5 text-violet-400 border border-violet-500/20"
                >
                  My Orders
                </Link>
              </nav>
            </div>
          </aside>

          {/* Orders Feed */}
          <section className="flex-1 space-y-6">
            <div className="border-b border-slate-900 pb-4">
              <h2 className="text-2xl font-extrabold text-white">Order History</h2>
              <p className="text-sm text-slate-400 mt-1">Track and manage your recent store purchases.</p>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-48 rounded-2xl bg-slate-900/40 animate-pulse border border-slate-900" />
                ))}
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 space-y-4 shadow-sm"
                  >
                    {/* Order Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-4 text-sm">
                      <div className="space-y-1">
                        <span className="text-xs text-slate-500">Order Number</span>
                        <span className="block font-bold text-white font-mono">{order.orderNumber}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-slate-500">Date Placed</span>
                        <span className="block font-medium text-slate-350">
                          {new Date(order.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="space-y-1 text-right">
                        <span className="text-xs text-slate-500">Total Charged</span>
                        <span className="block font-extrabold text-white">${parseFloat(order.total).toFixed(2)}</span>
                      </div>
                      <span className={`rounded-md border px-2.5 py-1 text-xs font-bold uppercase ${getStatusBadge(order.orderStatus)}`}>
                        {order.orderStatus}
                      </span>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-4">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-slate-950 flex-shrink-0">
                            <Image
                              src={
                                item.product?.images?.[0]?.url ||
                                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200&auto=format&fit=crop'
                              }
                              alt={item.productNameSnapshot}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 text-sm">
                            <span className="font-bold text-white block">{item.productNameSnapshot}</span>
                            <span className="text-slate-500">Qty: {item.quantity}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-300">
                            ${parseFloat(item.productPriceSnapshot).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Action Bar (e.g. Cancel order) */}
                    <div className="flex items-center justify-between border-t border-slate-900 pt-4 text-xs">
                      <div className="text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Payment: <span className="text-slate-300 font-bold uppercase">{order.paymentStatus}</span></span>
                        <span>Shipment: <span className="text-slate-300 font-bold uppercase">{order.shipmentStatus}</span></span>
                      </div>
                      {order.orderStatus === 'pending' && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-bold text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-slate-400">
                <p className="mb-6">You haven&apos;t placed any orders yet.</p>
                <Link
                  href="/products"
                  className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white"
                >
                  Browse Products
                </Link>
              </div>
            )}
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
