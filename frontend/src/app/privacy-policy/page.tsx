'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />
      
      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-900 bg-slate-900/20 p-8 backdrop-blur-sm shadow-xl space-y-6">
          <h1 className="text-3xl font-extrabold text-white">Privacy Policy</h1>
          <p className="text-xs text-slate-500">Last updated: July 18, 2026</p>
          
          <div className="border-b border-slate-900 pb-4">
            <h2 className="text-lg font-bold text-violet-400 mt-6 mb-2">1. Information We Collect</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We collect user account data (such as name, email, and password hashes) when you register. During the checkout process, we collect shipping and billing addresses. Payment card details are securely handled directly by our PCI-compliant third-party processor (Razorpay) and are never processed or stored on our servers.
            </p>
          </div>

          <div className="border-b border-slate-900 pb-4">
            <h2 className="text-lg font-bold text-violet-400 mt-6 mb-2">2. How We Protect Your Data</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We implement industry-standard database password hashing (bcrypt), token hashing (SHA-256 for session records), and transmit all sensitive data over secure HTTPS channels. Authorized administrative operators log in with credentials protected by strict rate limit configurations.
            </p>
          </div>

          <div className="border-b border-slate-900 pb-4">
            <h2 className="text-lg font-bold text-violet-400 mt-6 mb-2">3. Cookies and Sessions</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We utilize HttpOnly, SameSite cookies to manage secure refresh tokens and session states. These cookies protect against cross-site scripting (XSS) and cross-site request forgery (CSRF) vulnerabilities by restricting browser script access.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-violet-400 mt-6 mb-2">4. Contact Us</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              If you have any questions about this privacy policy, please contact our administrative team at privacy@veloce.com.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
