'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!user) {
      router.push('/login');
    } else {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-slate-950">
          <p className="text-slate-400">Loading profile configurations...</p>
        </main>
        <Footer />
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.put('/users/profile', {
        name,
        email,
        password: password || undefined,
      });
      await refreshUser();
      setSuccess('Profile updated successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
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
                  className="rounded-xl bg-violet-500/10 px-4 py-2.5 text-violet-400 border border-violet-500/20"
                >
                  Account Profile
                </Link>
                <Link
                  href="/orders"
                  className="rounded-xl px-4 py-2.5 text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                >
                  My Orders
                </Link>
              </nav>
            </div>
          </aside>

          {/* Form Area */}
          <section className="flex-1 rounded-2xl border border-slate-900 bg-slate-900/40 p-8 backdrop-blur-sm shadow-xl">
            <h2 className="text-2xl font-extrabold text-white">Profile Settings</h2>
            <p className="text-sm text-slate-400 mt-1">Manage your account information and password.</p>

            <form onSubmit={handleUpdateProfile} className="mt-8 space-y-6">
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-450">
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-slate-900 pt-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">New Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-900 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-violet-500/10 hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
