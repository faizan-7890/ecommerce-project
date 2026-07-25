'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useUser } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import Image from 'next/image';
import { formatCurrency } from '@/lib/currency';
import { ConfettiBurst, FadeIn, EmptyState, Stagger, StaggerItem } from '@/components/motion';
import { flags } from '@/lib/featureFlags';

function OrdersContent() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebrate, setCelebrate] = useState(false);

  const loadOrders = async () => {
    try {
      const data = await api.get<any[]>('/orders');
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    } else if (isSignedIn) {
      loadOrders();
    }
  }, [isSignedIn, isLoaded, router]);

  // Order-success confetti: checkout navigates to /orders?celebrated=1
  useEffect(() => {
    if (searchParams.get('celebrated') !== '1') return;
    if (!flags.confettiSuccess) {
      router.replace('/orders');
      return;
    }
    const t = window.setTimeout(() => setCelebrate(true), 0);
    router.replace('/orders');
    return () => window.clearTimeout(t);
  }, [searchParams, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-base">
        <Header />
        <main className="flex flex-1 items-center justify-center bg-bg-base">
          <p className="text-text-muted">Loading order tracker...</p>
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
    } catch (err: any) {
      const error = err as Error;
      addToast(error.message || 'Failed to cancel order', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'border-success/20 bg-success/10 text-success';
      case 'cancelled':
        return 'border-danger/20 bg-danger/10 text-danger';
      case 'pending':
        return 'border-warning/20 bg-warning/10 text-warning';
      default:
        return 'border-primary/20 bg-primary/10 text-primary';
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg-base">
      <Header />
      <ConfettiBurst
        active={celebrate}
        onComplete={() => setCelebrate(false)}
      />

      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-8 md:flex-row">
          <aside className="w-full flex-shrink-0 md:w-56">
            <div className="rounded-2xl border border-border bg-surface/50 p-4 backdrop-blur-sm">
              <nav className="flex flex-col gap-2 text-sm font-semibold">
                <Link
                  href="/profile"
                  className="rounded-xl px-4 py-2.5 text-text-muted transition-all hover:bg-surface hover:text-text-main"
                >
                  Account Profile
                </Link>
                <Link
                  href="/orders"
                  className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-primary"
                >
                  My Orders
                </Link>
              </nav>
            </div>
          </aside>

          <section className="flex-1 space-y-6">
            <FadeIn className="border-b border-border pb-4">
              <h2 className="text-2xl font-extrabold text-text-main">Order History</h2>
              <p className="mt-1 text-sm text-text-muted">
                Track and manage your recent store purchases.
              </p>
            </FadeIn>

            {loading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="velo-shimmer h-48 rounded-2xl border border-border"
                  />
                ))}
              </div>
            ) : orders.length > 0 ? (
              <Stagger className="space-y-6">
                {orders.map((order) => (
                  <StaggerItem key={order.id}>
                    <div className="space-y-4 rounded-2xl border border-border bg-surface/30 p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4 text-sm">
                        <div className="space-y-1">
                          <span className="text-xs text-text-muted">Order Number</span>
                          <span className="block font-mono font-bold text-text-main">
                            {order.orderNumber}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-text-muted">Date Placed</span>
                          <span className="block font-medium text-text-muted">
                            {new Date(order.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className="text-xs text-text-muted">Total Charged</span>
                          <span className="block font-extrabold text-text-main">
                            {formatCurrency(parseFloat(order.total))}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-md border px-2.5 py-1 text-xs font-bold uppercase ${getStatusBadge(order.orderStatus)}`}
                          >
                            {order.orderStatus}
                          </span>
                          <Link
                            href={`/orders/${order.id}`}
                            className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-bg-base"
                          >
                            Track Order &rarr;
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-4">
                            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-bg-base">
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
                              <span className="block font-bold text-text-main">
                                {item.productNameSnapshot}
                              </span>
                              <span className="text-text-muted">Qty: {item.quantity}</span>
                            </div>
                            <span className="text-sm font-semibold text-text-muted">
                              {formatCurrency(parseFloat(item.productPriceSnapshot))}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-text-muted">
                          <span>
                            Payment:{' '}
                            <span className="font-bold uppercase text-text-main">
                              {order.paymentStatus}
                            </span>
                          </span>
                          <span>
                            Shipment:{' '}
                            <span className="font-bold uppercase text-text-main">
                              {order.shipmentStatus}
                            </span>
                          </span>
                        </div>
                        {order.orderStatus === 'pending' && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-1.5 font-bold text-danger transition-all hover:bg-danger/20"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <EmptyState
                title="No orders yet"
                description="You haven't placed any orders yet."
                action={
                  <Link
                    href="/products"
                    className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-bg-base shadow-md"
                  >
                    Browse Products
                  </Link>
                }
              />
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-bg-base">
          <Header />
          <main className="flex flex-1 items-center justify-center">
            <p className="text-text-muted">Loading order tracker...</p>
          </main>
          <Footer />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
