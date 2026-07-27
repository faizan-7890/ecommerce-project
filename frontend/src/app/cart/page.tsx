'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { formatCurrency } from '@/lib/currency';
import { EmptyState, FadeIn, MagneticButton } from '@/components/motion';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, loading } = useCart();
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { addToast } = useToast();

  React.useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/');
  }, [isSignedIn, isLoaded, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-base text-text-main">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-text-muted">Redirecting…</p>
        </main>
        <Footer />
      </div>
    );
  }

  const handleQtyChange = async (itemId: number, targetQty: number, maxStock: number) => {
    if (targetQty <= 0) {
      try {
        await removeFromCart(itemId);
      } catch (err: unknown) {
        addToast((err as Error).message || 'Failed to remove item', 'error');
      }
      return;
    }
    if (targetQty > maxStock) {
      addToast(`Cannot exceed available stock of ${maxStock}`, 'error');
      return;
    }
    try {
      await updateQuantity(itemId, targetQty);
    } catch (err: unknown) {
      addToast((err as Error).message || 'Failed to update quantity', 'error');
    }
  };

  const items: any[] = cart?.items ?? [];
  const subtotal = items.reduce((acc, item) => {
    const base =
      item.variant?.price != null
        ? parseFloat(String(item.variant.price))
        : parseFloat(String(item.product?.basePrice ?? 0));
    const discount = parseFloat(String(item.product?.discountPrice ?? 0));
    return acc + Math.max(base - discount, 0) * item.quantity;
  }, 0);
  const shippingFee = subtotal >= 100 ? 0 : 10;
  const taxAmount = subtotal * 0.08;
  const total = subtotal + shippingFee + taxAmount;

  return (
    <div className="flex min-h-screen flex-col bg-bg-base text-text-main">
      <Header />
      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <h1 className="mb-8 text-3xl font-extrabold text-text-main">Shopping Cart</h1>
          </FadeIn>

          {items.length > 0 ? (
            <div className="flex flex-col gap-8 lg:flex-row">
              <div className="flex-1 space-y-4">
                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    const base =
                      item.variant?.price != null
                        ? parseFloat(String(item.variant.price))
                        : parseFloat(String(item.product?.basePrice ?? 0));
                    const discount = parseFloat(String(item.product?.discountPrice ?? 0));
                    const finalUnitPrice = Math.max(base - discount, 0);
                    const hasDiscount = discount > 0;
                    const imageUrl =
                      item.product?.images?.[0]?.url ||
                      'https://placehold.co/200x200/1e293b/94a3b8?text=Product';
                    const maxStock = item.variant?.stock ?? 9999;

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                        className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface/50 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-bg-base">
                            <Image
                              src={imageUrl}
                              alt={item.product?.name ?? 'Product'}
                              fill
                              className="object-cover object-center"
                            />
                          </div>
                          <div>
                            <Link
                              href={`/products/${item.productId ?? item.product?.id}`}
                              className="font-bold text-text-main transition-colors hover:text-primary"
                            >
                              {item.product?.name ?? 'Product'}
                            </Link>
                            {(item.variant?.size || item.variant?.color) && (
                              <div className="mt-0.5 text-xs text-text-muted">
                                {item.variant.size && (
                                  <>
                                    Size:{' '}
                                    <span className="mr-2 text-text-main">{item.variant.size}</span>
                                  </>
                                )}
                                {item.variant.color && (
                                  <>
                                    Color: <span className="text-text-main">{item.variant.color}</span>
                                  </>
                                )}
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center gap-2 text-xs">
                              {hasDiscount ? (
                                <>
                                  <span className="font-semibold text-text-main">
                                    {formatCurrency(finalUnitPrice)}
                                  </span>
                                  <span className="text-text-muted line-through">
                                    {formatCurrency(base)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-text-muted">{formatCurrency(base)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-6 border-t border-border pt-4 sm:justify-end sm:border-t-0 sm:pt-0">
                          <div className="flex items-center rounded-lg border border-border bg-bg-base">
                            <button
                              onClick={() => handleQtyChange(item.id, item.quantity - 1, maxStock)}
                              className="px-3 py-1.5 text-text-muted hover:text-text-main disabled:opacity-30"
                              disabled={loading || item.quantity <= 1}
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-text-main">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQtyChange(item.id, item.quantity + 1, maxStock)}
                              className="px-3 py-1.5 text-text-muted hover:text-text-main disabled:opacity-30"
                              disabled={loading}
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right">
                            <span className="block text-sm font-bold text-text-main">
                              {formatCurrency(finalUnitPrice * item.quantity)}
                            </span>
                            <button
                              onClick={() => handleQtyChange(item.id, 0, maxStock)}
                              className="mt-1 text-xs font-medium text-danger transition-colors hover:brightness-110 disabled:opacity-50"
                              disabled={loading}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="w-full flex-shrink-0 lg:w-80">
                <div className="sticky top-24 rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur-sm shadow-xl">
                  <h2 className="border-b border-border pb-4 text-lg font-bold text-text-main">
                    Order Summary
                  </h2>
                  <div className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between text-text-muted">
                      <span>
                        Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})
                      </span>
                      <span className="font-semibold text-text-main">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>Shipping</span>
                      <span
                        className={
                          shippingFee === 0
                            ? 'font-semibold text-success'
                            : 'font-semibold text-text-main'
                        }
                      >
                        {shippingFee === 0 ? 'Free' : formatCurrency(shippingFee)}
                      </span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>Tax (8%)</span>
                      <span className="font-semibold text-text-main">
                        {formatCurrency(taxAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3 text-base font-bold text-text-main">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <MagneticButton
                    className="mt-8 w-full"
                    disabled={loading}
                    onClick={() => router.push('/checkout')}
                  >
                    Proceed to Checkout
                  </MagneticButton>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Your cart is empty"
              description="Add products from the catalog to start checkout."
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
