'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/currency';
import type { CartItem } from '@/types';

interface MiniCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MiniCart({ isOpen, onClose }: MiniCartProps) {
  const { cart, removeFromCart, updateQuantity } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-bg-base/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-bg-base shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-bg-base p-6">
              <h2 className="text-xl font-bold text-text-main">Your Cart</h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-text-muted transition-colors hover:bg-surface hover:text-text-main"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {cart && cart.items.length > 0 ? (
                <AnimatePresence initial={false}>
                  {cart.items.map((item: CartItem) => {
                    const image =
                      item.product.images?.[0]?.url ||
                      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop';
                    const price = item.variant
                      ? parseFloat(
                          item.variant.price?.toString() ||
                            item.product.basePrice.toString()
                        )
                      : parseFloat(item.product.basePrice.toString());
                    const finalPrice =
                      price - parseFloat(item.product.discountPrice?.toString() || '0');

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                        className="flex gap-4 rounded-xl border border-border bg-surface/50 p-4"
                      >
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-bg-base">
                          <Image
                            src={image}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <div className="flex justify-between">
                            <h3 className="line-clamp-1 text-sm font-bold text-text-main">
                              {item.product.name}
                            </h3>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-text-muted transition-colors hover:text-danger"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="h-4 w-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                          {item.variant && (
                            <p className="mt-0.5 text-xs text-text-muted">
                              {item.variant.size && `Size: ${item.variant.size}`}{' '}
                              {item.variant.color && `| Color: ${item.variant.color}`}
                            </p>
                          )}
                          <div className="mt-auto flex items-end justify-between">
                            <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-base px-2 py-1">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="text-text-muted hover:text-text-main"
                                disabled={item.quantity <= 1}
                              >
                                -
                              </button>
                              <span className="min-w-[1rem] text-center text-xs font-semibold text-text-main">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="text-text-muted hover:text-text-main"
                              >
                                +
                              </button>
                            </div>
                            <span className="font-bold text-text-main">
                              {formatCurrency(finalPrice)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              ) : (
                <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
                  <div className="rounded-full border border-border bg-surface p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-8 w-8 text-text-muted"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-text-muted">Your cart is feeling a little empty.</p>
                  <button
                    onClick={onClose}
                    className="font-medium text-primary transition-colors hover:brightness-110"
                  >
                    Continue Shopping
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            {cart && cart.items.length > 0 && (
              <div className="border-t border-border bg-bg-base p-6">
                <div className="mb-6 flex justify-between text-base font-bold text-text-main">
                  <p>Subtotal</p>
                  <p>
                    {formatCurrency(
                      cart.items.reduce((acc, item: CartItem) => {
                        const price = item.variant
                          ? parseFloat(
                              item.variant.price?.toString() ||
                                item.product.basePrice.toString()
                            )
                          : parseFloat(item.product.basePrice.toString());
                        const finalPrice =
                          price -
                          parseFloat(item.product.discountPrice?.toString() || '0');
                        return acc + finalPrice * item.quantity;
                      }, 0)
                    )}
                  </p>
                </div>
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-4 text-sm font-bold text-bg-base shadow-xl shadow-primary/20 transition-all hover:brightness-110"
                >
                  Proceed to Checkout
                </Link>
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={onClose}
                    className="text-xs font-semibold text-text-muted transition-colors hover:text-text-main"
                  >
                    or continue shopping
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
