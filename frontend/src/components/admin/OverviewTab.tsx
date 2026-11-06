'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdminStats } from '@/types';
import AdminChart from '@/components/AdminChart';

export default function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [rangeType, setRangeType] = useState('last30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      let query = `?rangeType=${rangeType}`;
      if (rangeType === 'custom') {
        if (startDate) query += `&startDate=${startDate}`;
        if (endDate) query += `&endDate=${endDate}`;
      }
      const data = await api.get<AdminStats>(`/admin/stats${query}`);
      setStats(data);
    } catch (err) {
      console.error('Error fetching admin stats', err);
    } finally {
      setLoadingStats(false);
    }
  }, [endDate, rangeType, startDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStats(), 0);
    return () => window.clearTimeout(timer);
  }, [loadStats]);

  return (
    <div className="space-y-8">
      {/* Range Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-900 bg-slate-900/20 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-450">Range Filter</span>
          <select
            value={rangeType}
            onChange={(e) => setRangeType(e.target.value)}
            className="rounded-lg border border-slate-850 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="thisyear">This Year</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {rangeType === 'custom' && (
          <div className="flex items-center gap-3 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-slate-200"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-slate-200"
            />
            <button
              onClick={loadStats}
              className="rounded bg-violet-600 hover:bg-violet-500 px-3 py-1 font-bold text-white"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-900/40 border border-slate-900" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Revenue</span>
              <span className="block mt-2 text-2xl font-black text-white">
                ${stats.totalRevenue.toFixed(2)}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Orders count</span>
              <span className="block mt-2 text-2xl font-black text-white">
                {stats.totalOrders}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Products Catalog</span>
              <span className="block mt-2 text-2xl font-black text-white">
                {stats.totalProducts}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">New Customers</span>
              <span className="block mt-2 text-2xl font-black text-white">
                {stats.totalUsers}
              </span>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="w-full">
            <AdminChart data={stats.revenueChart || []} />
          </div>

          {/* More metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Low stock alerts */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                Low-Stock Warnings (Variants stock &lt; threshold)
              </h3>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase">
                      <th className="pb-3">Product Spec</th>
                      <th className="pb-3">SKU</th>
                      <th className="pb-3 text-center">Remaining</th>
                      <th className="pb-3 text-right">Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.lowStockProducts.length > 0 ? (
                      stats.lowStockProducts.map((v, index) => (
                        <tr key={index} className="border-b border-slate-900/50">
                          <td className="py-2.5 font-bold text-slate-200">{v.name}</td>
                          <td className="py-2.5 text-slate-400 font-mono">{v.sku}</td>
                          <td className="py-2.5 text-center text-red-400 font-extrabold">{v.stock}</td>
                          <td className="py-2.5 text-right text-slate-500">{v.threshold}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-500">
                          All products stocks are above low limits.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Best Selling Items */}
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
              <h3 className="text-base font-bold text-white mb-4">Best Sellers</h3>
              <div className="space-y-4 text-xs">
                {stats.bestSellers.length > 0 ? (
                  stats.bestSellers.map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b border-slate-900 pb-3 last:border-0 last:pb-0">
                      <div>
                        <span className="font-bold text-white block truncate w-40">{item.name}</span>
                        <span className="text-slate-550">{item.totalQty} units sold</span>
                      </div>
                      <span className="font-extrabold text-violet-400">${item.revenue.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-6">No sales recorded in this period.</p>
                )}
              </div>
            </div>
          </div>

          {/* Audit Logs section */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
            <h3 className="text-base font-bold text-white mb-4">System Actions Log (Audit Trail)</h3>
            <div className="space-y-3.5 max-h-60 overflow-y-auto pr-2">
              {stats.auditLogs.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row justify-between sm:items-center text-xs border-b border-slate-900/40 pb-3 last:border-0 last:pb-0 gap-1">
                  <div>
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-bold uppercase tracking-wider text-[10px] text-slate-400 mr-2">
                      {log.action}
                    </span>
                    <span className="text-slate-300 font-semibold">{log.description}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleString()} by {log.user?.name || 'System'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-slate-400">Failed loading database statistics.</p>
      )}
    </div>
  );
}
