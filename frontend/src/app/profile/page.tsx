'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface Address {
  id: number;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressType: string;
  isDefault: boolean;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'profile' | 'addresses'>('profile');

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

  // Address Form Fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [addressType, setAddressType] = useState('shipping');
  const [isDefault, setIsDefault] = useState(false);

  // General Notification States
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else {
      setName(user.name);
      setEmail(user.email);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  }, [user]);

  // Load Addresses
  const loadAddresses = async () => {
    if (!user) return;
    setAddressLoading(true);
    try {
      const data = await api.get('/users/addresses');
      setAddresses(data);
    } catch (err: unknown) {
      console.error('Error fetching addresses:', err);
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'addresses') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Loading profile configurations...</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Update Profile & Password Handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // 1. Update basic information
      await api.put('/users/profile', { name, email });
      
      // 2. Update password if requested
      if (newPassword) {
        if (!currentPassword) {
          setError('Please provide current password to update your password');
          setLoading(false);
          return;
        }
        await api.put('/users/password', {
          currentPassword,
          newPassword,
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      await refreshUser();
      setSuccess('Profile details updated successfully!');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to update profile info');
    } finally {
      setLoading(false);
    }
  };

  // Add or Edit Address Submit Handler
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      fullName,
      phoneNumber,
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state,
      postalCode,
      country,
      addressType,
      isDefault,
    };

    setAddressLoading(true);
    try {
      if (editingAddressId) {
        // Edit Address
        await api.put(`/users/addresses/${editingAddressId}`, payload);
        setSuccess('Address updated successfully!');
      } else {
        // Add Address
        await api.post('/users/addresses', payload);
        setSuccess('New address card added!');
      }

      resetAddressForm();
      await loadAddresses();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to process address card');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleEditAddressClick = (addr: Address) => {
    setEditingAddressId(addr.id);
    setFullName(addr.fullName);
    setPhoneNumber(addr.phoneNumber);
    setAddressLine1(addr.addressLine1);
    setAddressLine2(addr.addressLine2 || '');
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
    setCountry(addr.country);
    setAddressType(addr.addressType);
    setIsDefault(addr.isDefault);
    setShowAddressForm(true);
  };

  const handleDeleteAddressClick = async (addrId: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    setAddressLoading(true);
    try {
      await api.delete(`/users/addresses/${addrId}`);
      setSuccess('Address deleted successfully.');
      await loadAddresses();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to delete address card');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSetDefaultAddress = async (addrId: number) => {
    setAddressLoading(true);
    try {
      await api.put(`/users/addresses/${addrId}`, { isDefault: true });
      await loadAddresses();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to set default address');
    } finally {
      setAddressLoading(false);
    }
  };

  const resetAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setFullName('');
    setPhoneNumber('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setPostalCode('');
    setCountry('');
    setAddressType('shipping');
    setIsDefault(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl flex flex-col md:flex-row gap-8">
          
          {/* Quick Nav Sidebar */}
          <aside className="w-full md:w-56 flex-shrink-0">
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-4 backdrop-blur-sm">
              <nav className="flex flex-col gap-2 text-sm font-semibold">
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setError('');
                    setSuccess('');
                  }}
                  className={`w-full text-left rounded-xl px-4 py-2.5 transition-all ${
                    activeTab === 'profile'
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  Account Profile
                </button>
                <button
                  onClick={() => {
                    setActiveTab('addresses');
                    setError('');
                    setSuccess('');
                  }}
                  className={`w-full text-left rounded-xl px-4 py-2.5 transition-all ${
                    activeTab === 'addresses'
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  Address Book
                </button>
                <Link
                  href="/orders"
                  className="rounded-xl px-4 py-2.5 text-slate-400 hover:bg-slate-900 hover:text-white transition-all block"
                >
                  My Orders
                </Link>
              </nav>
            </div>
          </aside>

          {/* Form Area */}
          <section className="flex-1 rounded-2xl border border-slate-900 bg-slate-900/40 p-8 backdrop-blur-sm shadow-xl">
            {error && (
              <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-450">
                {success}
              </div>
            )}

            {activeTab === 'profile' ? (
              <>
                <h2 className="text-2xl font-extrabold text-white">Profile Settings</h2>
                <p className="text-sm text-slate-450 mt-1">Manage your account information and password.</p>

                <form onSubmit={handleUpdateProfile} className="mt-8 space-y-6">
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

                  <div className="border-t border-slate-900 pt-6 space-y-6">
                    <h3 className="text-lg font-bold text-white">Change Password</h3>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">New Password</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
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
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">Address Book</h2>
                    <p className="text-sm text-slate-450 mt-1">Manage your checkout and billing address locations.</p>
                  </div>
                  {!showAddressForm && (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-bold text-white transition-colors"
                    >
                      Add New Address
                    </button>
                  )}
                </div>

                {/* Address Create/Edit Form */}
                {showAddressForm ? (
                  <form onSubmit={handleAddressSubmit} className="mt-8 rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-4">
                    <h3 className="text-lg font-bold text-white">
                      {editingAddressId ? 'Update Address Details' : 'Add New Address Card'}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400">Full Name</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-sm focus:outline-none text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400">Phone Number</label>
                        <input
                          type="text"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-sm focus:outline-none text-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400">Address Line 1</label>
                      <input
                        type="text"
                        required
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-sm focus:outline-none text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400">Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-sm focus:outline-none text-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="col-span-1">
                        <label className="text-xs font-bold text-slate-400">City</label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-sm focus:outline-none text-slate-200"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-xs font-bold text-slate-400">State</label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-sm focus:outline-none text-slate-200"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-xs font-bold text-slate-400">Postal Code</label>
                        <input
                          type="text"
                          required
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-sm focus:outline-none text-slate-200"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-xs font-bold text-slate-400">Country</label>
                        <input
                          type="text"
                          required
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-sm focus:outline-none text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 pt-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-400">Address Type</label>
                        <select
                          value={addressType}
                          onChange={(e) => setAddressType(e.target.value)}
                          className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-200 focus:outline-none"
                        >
                          <option value="shipping">Shipping Address</option>
                          <option value="billing">Billing Address</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={isDefault}
                          onChange={(e) => setIsDefault(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-900 focus:ring-0 text-violet-600"
                        />
                        <label htmlFor="isDefault" className="text-xs font-semibold text-slate-350 cursor-pointer">
                          Set as Default Address
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
                      <button
                        type="button"
                        onClick={resetAddressForm}
                        className="rounded-lg bg-slate-900 hover:bg-slate-850 px-4 py-2 text-xs font-bold text-slate-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-bold text-white"
                      >
                        {editingAddressId ? 'Update' : 'Save'} Address
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Address Cards Grid */
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addressLoading && addresses.length === 0 ? (
                      <p className="text-slate-500 text-sm animate-pulse">Loading address cards...</p>
                    ) : addresses.length > 0 ? (
                      addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={`relative flex flex-col p-5 rounded-2xl border transition-all ${
                            addr.isDefault
                              ? 'border-violet-500/50 bg-violet-500/5'
                              : 'border-slate-900 bg-slate-900/10'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-sm font-bold text-white">{addr.fullName}</span>
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                {addr.addressType}
                              </span>
                              {addr.isDefault && (
                                <span className="rounded bg-violet-500/20 border border-violet-500/35 px-2 py-0.5 text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                                  Default
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-slate-400 space-y-1 flex-1">
                            <p>{addr.addressLine1}</p>
                            {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                            <p>{addr.city}, {addr.state} {addr.postalCode}</p>
                            <p>{addr.country}</p>
                            <p className="pt-2 text-slate-505 font-medium">Phone: {addr.phoneNumber}</p>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-slate-900/50 pt-4 text-xs font-bold">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleEditAddressClick(addr)}
                                className="text-slate-400 hover:text-white"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteAddressClick(addr.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                            
                            {!addr.isDefault && (
                              <button
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-violet-400 hover:text-violet-300"
                              >
                                Make Default
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-10 rounded-2xl border border-dashed border-slate-850 text-slate-550 text-sm">
                        No addresses registered in your address book.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
