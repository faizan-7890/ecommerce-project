'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsAndConditions() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />
      
      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-900 bg-slate-900/20 p-8 backdrop-blur-sm shadow-xl space-y-6">
          <h1 className="text-3xl font-extrabold text-white">Terms and Conditions</h1>
          <p className="text-xs text-slate-500">Last updated: July 18, 2026</p>
          
          <div className="border-b border-slate-900 pb-4">
            <h2 className="text-lg font-bold text-violet-400 mt-6 mb-2">1. Purchases and Cancellations</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              When placing an order, item stock is allocated inside atomic transactions. If payment is unsuccessful or not received, stock allocations are rolled back. Users may cancel orders while they are in the &apos;pending&apos; state, which automatically restores product stock. Once an order enters &apos;processing&apos; or &apos;shipped&apos;, cancellations are subject to administrative review.
            </p>
          </div>

          <div className="border-b border-slate-900 pb-4">
            <h2 className="text-lg font-bold text-violet-400 mt-6 mb-2">2. Pricing, Shipping, and Taxes</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We apply an 8% sales tax calculation on taxable subtotals (subtotal less active discount values). Shipping charges are free for all orders above $100.00, otherwise a flat rate of $10.00 is applied. Discounts are validated in real-time and subject to min-order validations and usage thresholds.
            </p>
          </div>

          <div className="border-b border-slate-900 pb-4">
            <h2 className="text-lg font-bold text-violet-400 mt-6 mb-2">3. Refund Policies</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Refunds are processed to the original Stripe transaction reference. A refund action can only be initiated on paid transactions. Partial refunds are supported and will decrement order statuses dynamically. Upon completing a refund, items are returned to stock.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-violet-400 mt-6 mb-2">4. Governing Law</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              These terms are governed and construed in accordance with standard commerce regulations. Veloce reserves the right to modify or replace these terms at any time.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
