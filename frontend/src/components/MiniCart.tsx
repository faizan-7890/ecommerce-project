'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/currency';

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
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col bg-slate-950 border-l border-slate-800 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-900 bg-slate-950">
              <h2 className="text-xl font-bold text-white">Your Cart</h2>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart && cart.items.length > 0 ? (
                cart.items.map((item: any) => {
                  const image = item.product.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop';
                  const price = item.variant ? parseFloat(item.variant.price?.toString() || item.product.basePrice.toString()) : parseFloat(item.product.basePrice.toString());
                  const finalPrice = price - parseFloat(item.product.discountPrice?.toString() || '0');

                  return (
                    <motion.div 
                      key={item.id} 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex gap-4 p-4 rounded-xl border border-slate-900 bg-slate-900/40"
                    >
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-900">
                        <Image src={image} alt={item.product.name} fill className="object-cover" />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex justify-between">
                          <h3 className="text-sm font-bold text-white line-clamp-1">{item.product.name}</h3>
                          <button onClick={() => removeFromCart(item.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        {item.variant && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {item.variant.size && `Size: ${item.variant.size}`} {item.variant.color && `| Color: ${item.variant.color}`}
                          </p>
                        )}
                        <div className="mt-auto flex items-end justify-between">
                          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-slate-400 hover:text-white" disabled={item.quantity <= 1}>-</button>
                            <span className="text-xs font-semibold text-white min-w-[1rem] text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-slate-400 hover:text-white">+</button>
                          </div>
                          <span className="font-bold text-white">{formatCurrency(finalPrice)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="p-4 rounded-full bg-slate-900">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-400">Your cart is feeling a little empty.</p>
                  <button onClick={onClose} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Continue Shopping</button>
                </div>
              )}
            </div>

            {/* Footer */}
            {cart && cart.items.length > 0 && (
              <div className="border-t border-slate-900 bg-slate-950 p-6">
                <div className="flex justify-between text-base font-bold text-white mb-6">
                  <p>Subtotal</p>
                  <p>{formatCurrency(cart.items.reduce((acc, item: any) => {
                    const price = item.variant ? parseFloat(item.variant.price?.toString() || item.product.basePrice.toString()) : parseFloat(item.product.basePrice.toString());
                    const finalPrice = price - parseFloat(item.product.discountPrice?.toString() || '0');
                    return acc + finalPrice * item.quantity;
                  }, 0))}</p>
                </div>
                <Link
                  href="/cart"
                  onClick={onClose}
                  className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-violet-500/20 hover:opacity-90 transition-opacity"
                >
                  Proceed to Checkout
                </Link>
                <div className="mt-4 flex justify-center">
                  <button onClick={onClose} className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors">
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
