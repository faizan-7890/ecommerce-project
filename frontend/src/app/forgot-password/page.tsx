'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = (await api.post('/auth/forgot-password', { email })) as {
        message: string;
      };
      setSuccess(data.message || 'If this email exists in our records, a reset link will be sent.');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-900 bg-slate-900/40 p-8 backdrop-blur-sm shadow-xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white">Forgot Password</h2>
            <p className="mt-2 text-sm text-slate-400">
              Enter your account email and we will send a reset link if it exists.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                {success}
              </div>
            )}

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-650 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-bold text-white shadow-xl shadow-violet-500/10 hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            <Link href="/login" className="font-semibold text-violet-400 hover:text-violet-300">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
