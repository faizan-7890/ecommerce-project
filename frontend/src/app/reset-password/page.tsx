'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password) {
      setError('Please provide the reset token and a new password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = (await api.post('/auth/reset-password', { token, password })) as {
        message: string;
      };
      setSuccess(data.message || 'Password has been reset successfully');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Reset failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-900 bg-slate-900/40 p-8 backdrop-blur-sm shadow-xl">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-white">Reset Password</h2>
        <p className="mt-2 text-sm text-slate-400">Choose a new password for your account</p>
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

        {!tokenFromUrl && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Reset Token
            </label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            New Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Confirm Password
          </label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-bold text-white shadow-xl shadow-violet-500/10 hover:opacity-95 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Reset Password'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        <Link href="/login" className="font-semibold text-violet-400 hover:text-violet-300">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-slate-400">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
