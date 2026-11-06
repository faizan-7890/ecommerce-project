'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { AdminOrderSummary, AdminOrdersResponse } from '@/types';
import { exportToCsv } from '@/lib/exportCsv';
import { getErrorMessage } from '@/lib/errors';

export default function OrdersTab() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const loadAllOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await api.get<AdminOrdersResponse>('/admin/orders');
      setOrders(data.orders);
    } catch (err) {
      console.error('Error fetching admin orders', err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAllOrders(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAllOrders]);

  const handleUpdateOrderStatus = async (orderId: number, field: string, value: string) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { [field]: value });
      addToast(`Order ${field} updated to '${value}'`, 'info');
      loadAllOrders();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to update order status'), 'error');
    }
  };

  const exportOrdersCsv = () => {
    const headers = ['Order ID', 'Order Number', 'User ID', 'Total Amount', 'Order Status', 'Payment Status', 'Shipment Status', 'Created At'];
    const rows = orders.map((o) => [
      o.id,
      o.orderNumber || o.id,
      o.userId,
      o.total || 0,
      o.orderStatus,
      o.paymentStatus,
      o.shipmentStatus,
      o.createdAt,
    ]);
    exportToCsv(`veloce_orders_${Date.now()}`, headers, rows);
    addToast('Orders report exported to CSV', 'success');
  };

  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">System Orders</h3>
        <button
          onClick={exportOrdersCsv}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg border border-slate-700 transition-colors"
        >
          📥 Export CSV
        </button>
      </div>

      {loadingOrders ? (
        <p className="text-slate-450 animate-pulse text-sm">Syncing orders feed...</p>
      ) : (
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 text-xs font-bold uppercase">
                <th className="pb-3">Order Number</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Items Charged</th>
                <th className="pb-3">Total Charged</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => (
                <tr key={ord.id} className="border-b border-slate-900/40">
                  <td className="py-4 font-mono font-bold text-white">{ord.orderNumber}</td>
                  <td className="py-4">
                    <span className="block text-slate-200 font-semibold">{ord.user?.name || 'Unknown'}</span>
                    <span className="text-xs text-slate-550">{ord.user?.email || '—'}</span>
                  </td>
                  <td className="py-4 text-slate-400">
                    {ord.items.map((item) => (
                      <span key={item.id} className="block text-xs">
                        • {item.productNameSnapshot} <span className="text-slate-600">x{item.quantity}</span>
                      </span>
                    ))}
                  </td>
                  <td className="py-4 text-slate-350">${ord.total.toFixed(2)}</td>
                  <td className="py-4">
                    <div className="flex flex-col gap-1 text-[10px]">
                      <span className="font-bold">Order: <span className="text-violet-400 uppercase">{ord.orderStatus}</span></span>
                      <span className="text-slate-400">Payment: <span className="text-slate-350 uppercase">{ord.paymentStatus}</span></span>
                      <span className="text-slate-400">Shipment: <span className="text-slate-350 uppercase">{ord.shipmentStatus}</span></span>
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <div className="inline-flex flex-col gap-1.5 text-left text-[10px] w-36 bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-550 font-medium">Order:</span>
                        <select
                          value={ord.orderStatus}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, 'orderStatus', e.target.value)}
                          className="rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-200 px-1 py-0.5"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="returned">Returned</option>
                        </select>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-550 font-medium">Payment:</span>
                        <select
                          value={ord.paymentStatus}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, 'paymentStatus', e.target.value)}
                          className="rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-200 px-1 py-0.5 animate-none"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="authorized">Authorized</option>
                          <option value="paid">Paid</option>
                          <option value="failed">Failed</option>
                          <option value="refunded">Refunded</option>
                          <option value="partially_refunded">Partially</option>
                        </select>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-550 font-medium">Shipment:</span>
                        <select
                          value={ord.shipmentStatus}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, 'shipmentStatus', e.target.value)}
                          className="rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-200 px-1 py-0.5"
                        >
                          <option value="unfulfilled">Unfulfilled</option>
                          <option value="label_created">Label</option>
                          <option value="shipped">Shipped</option>
                          <option value="in_transit">In Transit</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
