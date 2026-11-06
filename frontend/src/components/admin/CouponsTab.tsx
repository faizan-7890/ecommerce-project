'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { AdminCoupon } from '@/types';
import { exportToCsv } from '@/lib/exportCsv';
import { getErrorMessage } from '@/lib/errors';

const EMPTY_COUPON = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '0.00',
  usageLimit: '',
  expirationDate: '',
};

export default function CouponsTab() {
  const { addToast } = useToast();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [newCoupon, setNewCoupon] = useState(EMPTY_COUPON);

  const loadAllCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const data = await api.get<AdminCoupon[]>('/admin/coupons');
      setCoupons(data);
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      setLoadingCoupons(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAllCoupons(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAllCoupons]);

  const handleCreateCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discountValue) return;

    try {
      await api.post('/coupons', {
        code: newCoupon.code,
        discountType: newCoupon.discountType,
        discountValue: parseFloat(newCoupon.discountValue),
        minOrderAmount: parseFloat(newCoupon.minOrderAmount),
        usageLimit: newCoupon.usageLimit ? parseInt(newCoupon.usageLimit) : undefined,
        expirationDate: newCoupon.expirationDate || undefined,
      });

      addToast('Coupon created successfully!', 'success');
      setNewCoupon(EMPTY_COUPON);
      loadAllCoupons();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to create coupon'), 'error');
    }
  };

  const exportCouponsCsv = () => {
    const headers = ['ID', 'Code', 'Discount Type', 'Discount Value', 'Min Order', 'Usage Limit', 'Times Used', 'Status'];
    const rows = coupons.map((c) => [
      c.id,
      c.code,
      c.discountType,
      c.discountValue,
      c.minOrderAmount,
      c.usageLimit ?? 'Unlimited',
      c.usageCount,
      c.isActive ? 'ACTIVE' : 'DISABLED',
    ]);
    exportToCsv(`veloce_coupons_${Date.now()}`, headers, rows);
    addToast('Coupons data exported to CSV', 'success');
  };

  const handleDeleteCoupon = async (couponId: number) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await api.delete(`/coupons/${couponId}`);
      addToast('Coupon deleted successfully', 'success');
      loadAllCoupons();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to delete coupon'), 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Coupons list */}
      <div className="lg:col-span-2 rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Manage Promo Coupons</h3>
          <button
            onClick={exportCouponsCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            📥 Export CSV
          </button>
        </div>

        {loadingCoupons ? (
          <p className="text-slate-450 animate-pulse text-sm">Loading coupons...</p>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase">
                  <th className="pb-3">Code</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Value</th>
                  <th className="pb-3">Min Order</th>
                  <th className="pb-3 text-center">Usages</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-slate-900/40">
                    <td className="py-3 font-bold text-white font-mono">{c.code}</td>
                    <td className="py-3 text-slate-400 capitalize">{c.discountType}</td>
                    <td className="py-3 text-slate-300">
                      {c.discountType === 'percentage' ? `${c.discountValue}%` : `$${c.discountValue}`}
                    </td>
                    <td className="py-3 text-slate-450">${c.minOrderAmount}</td>
                    <td className="py-3 text-center text-slate-400">
                      {c.usageCount} {c.usageLimit ? `/ ${c.usageLimit}` : ''}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteCoupon(c.id)}
                        className="font-bold text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Coupon Form */}
      <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 h-fit">
        <h3 className="text-lg font-bold text-white mb-4">Add Promo Coupon</h3>
        <form onSubmit={handleCreateCouponSubmit} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="text-slate-400 block mb-1">Coupon Code</label>
            <input
              type="text"
              required
              placeholder="WINTER50"
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
              className="w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-slate-200 uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 block mb-1">Discount Type</label>
              <select
                value={newCoupon.discountType}
                onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                className="w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-slate-300"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Flat ($)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Value</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="10.00"
                value={newCoupon.discountValue}
                onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: e.target.value })}
                className="w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 block mb-1">Min Order Amount ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="50.00"
                value={newCoupon.minOrderAmount}
                onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: e.target.value })}
                className="w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Usage Limit</label>
              <input
                type="number"
                placeholder="100"
                value={newCoupon.usageLimit}
                onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: e.target.value })}
                className="w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Expiration Date (Optional)</label>
            <input
              type="date"
              value={newCoupon.expirationDate}
              onChange={(e) => setNewCoupon({ ...newCoupon, expirationDate: e.target.value })}
              className="w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-slate-200 text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-4 rounded-lg bg-violet-605 hover:bg-violet-600 py-2.5 text-center text-white"
          >
            Add Coupon
          </button>
        </form>
      </div>
    </div>
  );
}
