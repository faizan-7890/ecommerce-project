'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useUser } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Product, Category, Order, Coupon, ProductVariant } from '@/types';
import AdminChart from '@/components/AdminChart';
import { exportToCsv } from '@/lib/exportCsv';

export default function AdminDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const { addToast } = useToast();

  // Selected tab: overview, products, categories, orders, coupons
  const [activeTab, setActiveTab] = useState('overview');

  // Stats / Date Range State
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [rangeType, setRangeType] = useState('last30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    brand: '',
    basePrice: '',
    discountPrice: '',
    categoryId: '',
    lowStockThreshold: '5',
    weight: '',
    dimensions: '',
    imageUrl: '',
  });

  // Variant Modal State
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);
  const [variantSku, setVariantSku] = useState('');
  const [variantPrice, setVariantPrice] = useState('');
  const [variantStock, setVariantStock] = useState('10');
  const [variantSize, setVariantSize] = useState('');
  const [variantColor, setVariantColor] = useState('');
  const [variantMaterial, setVariantMaterial] = useState('');

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '0.00',
    usageLimit: '',
    expirationDate: '',
  });

  // Redirect if not admin
  useEffect(() => {
    if (isLoaded && (!isSignedIn || user?.publicMetadata?.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, isLoaded, isSignedIn, router]);

  // Load Data based on Active Tab
  useEffect(() => {
    if (!isSignedIn || user?.publicMetadata?.role !== 'ADMIN') return;

    if (activeTab === 'overview') {
      loadStats();
    } else if (activeTab === 'products') {
      loadProducts();
      loadCategories();
    } else if (activeTab === 'categories') {
      loadCategories();
    } else if (activeTab === 'orders') {
      loadAllOrders();
    } else if (activeTab === 'coupons') {
      loadAllCoupons();
    }
  }, [activeTab, rangeType, user]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      let query = `?rangeType=${rangeType}`;
      if (rangeType === 'custom') {
        if (startDate) query += `&startDate=${startDate}`;
        if (endDate) query += `&endDate=${endDate}`;
      }
      const data = await api.get<any>(`/admin/stats${query}`);
      setStats(data);
    } catch (err) {
      console.error('Error fetching admin stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await api.get<{ products?: any[] }>('/products?limit=100');
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching admin products', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await api.get<any[]>('/categories');
      setCategories(data);
    } catch (err) {
      console.error('Error fetching admin categories', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadAllOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await api.get<any[]>('/admin/orders');
      setOrders(data);
    } catch (err) {
      console.error('Error fetching admin orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadAllCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const data = await api.get<any[]>('/coupons');
      setCoupons(data);
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  // Actions: Products Add
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.description || !newProduct.basePrice || !newProduct.categoryId) {
      addToast('Please fill in required fields', 'error');
      return;
    }

    try {
      const imagesArray = newProduct.imageUrl ? [newProduct.imageUrl] : [];
      await api.post('/products', {
        name: newProduct.name,
        description: newProduct.description,
        brand: newProduct.brand || undefined,
        basePrice: parseFloat(newProduct.basePrice),
        discountPrice: newProduct.discountPrice ? parseFloat(newProduct.discountPrice) : 0.00,
        lowStockThreshold: parseInt(newProduct.lowStockThreshold || '5'),
        weight: newProduct.weight ? parseFloat(newProduct.weight) : undefined,
        dimensions: newProduct.dimensions || undefined,
        categoryId: parseInt(newProduct.categoryId),
        images: imagesArray,
      });

      addToast('Product created successfully!', 'success');
      setNewProduct({
        name: '',
        description: '',
        brand: '',
        basePrice: '',
        discountPrice: '',
        categoryId: '',
        lowStockThreshold: '5',
        weight: '',
        dimensions: '',
        imageUrl: '',
      });
      loadProducts();
    } catch (err: any) {
      addToast(err.message || 'Failed to create product', 'error');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to disable this product?')) return;
    try {
      await api.delete(`/products/${productId}`);
      addToast('Product status toggled to inactive/disabled', 'info');
      loadProducts();
    } catch (err: any) {
      addToast(err.message || 'Failed to disable product', 'error');
    }
  };

  // Actions: Variants Admin Modal
  const handleOpenVariantsModal = (prod: Product) => {
    setVariantModalProduct(prod);
    setVariantSku(`${prod.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
    setVariantPrice('');
    setVariantStock('10');
    setVariantSize('');
    setVariantColor('');
    setVariantMaterial('');
  };

  const handleAddVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantSku || !variantModalProduct) return;

    try {
      await api.post(`/products/${variantModalProduct.id}/variants`, {
        sku: variantSku,
        price: variantPrice ? parseFloat(variantPrice) : undefined,
        stock: parseInt(variantStock),
        size: variantSize || undefined,
        color: variantColor || undefined,
        material: variantMaterial || undefined,
      });

      addToast('Variant successfully added!', 'success');
      // Reload product details inside modal
      const updatedProd = await api.get<any>(`/products/${variantModalProduct.id}`);
      setVariantModalProduct(updatedProd);

      // Reset variant form fields
      setVariantSku(`${updatedProd.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
      setVariantPrice('');
      setVariantStock('10');
      setVariantSize('');
      setVariantColor('');
      setVariantMaterial('');
    } catch (err: any) {
      addToast(err.message || 'Failed to add variant', 'error');
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (!confirm('Are you sure you want to delete this variant option?') || !variantModalProduct) return;
    try {
      await api.delete(`/products/${variantModalProduct.id}/variants/${variantId}`);
      addToast('Variant deleted', 'info');
      const updatedProd = await api.get<any>(`/products/${variantModalProduct.id}`);
      setVariantModalProduct(updatedProd);
    } catch (err: any) {
      addToast(err.message || 'Failed to delete variant', 'error');
    }
  };

  // Actions: Categories
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) {
      addToast('Please enter a category name', 'error');
      return;
    }

    try {
      await api.post('/categories', {
        name: newCategoryName,
        description: newCategoryDesc,
      });

      addToast('Category created successfully!', 'success');
      setNewCategoryName('');
      setNewCategoryDesc('');
      loadCategories();
    } catch (err: any) {
      addToast(err.message || 'Failed to create category', 'error');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${categoryId}`);
      addToast('Category deleted successfully', 'success');
      loadCategories();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete category', 'error');
    }
  };

  // Actions: Orders status updates
  const handleUpdateOrderStatus = async (orderId: number, field: string, value: string) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { [field]: value });
      addToast(`Order ${field} updated to '${value}'`, 'info');
      loadAllOrders();
    } catch (err: any) {
      addToast(err.message || 'Failed to update order status', 'error');
    }
  };

  // Actions: Coupons creation
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
      setNewCoupon({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderAmount: '0.00',
        usageLimit: '',
        expirationDate: '',
      });
      loadAllCoupons();
    } catch (err: any) {
      addToast(err.message || 'Failed to create coupon', 'error');
    }
  };

  const exportProductsCsv = () => {
    const headers = ['ID', 'Name', 'Brand', 'Category', 'Base Price', 'Stock Level'];
    const rows = products.map((p) => [
      p.id,
      p.name || (p as any).title || '',
      p.brand || '',
      p.category?.name || '',
      p.basePrice || (p as any).price || 0,
      p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0,
    ]);
    exportToCsv(`veloce_products_${Date.now()}`, headers, rows);
    addToast('Products inventory exported to CSV', 'success');
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

  const exportCouponsCsv = () => {
    const headers = ['ID', 'Code', 'Discount Type', 'Discount Value', 'Min Order', 'Usage Limit', 'Times Used', 'Status'];
    const rows = coupons.map((c) => [
      c.id,
      c.code,
      c.discountType,
      c.discountValue,
      c.minOrderAmount,
      c.usageLimit ?? 'Unlimited',
      (c as any).timesUsed || (c as any)._count?.usages || 0,
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
    } catch (err: any) {
      addToast(err.message || 'Failed to delete coupon', 'error');
    }
  };

  if (!isLoaded || !isSignedIn || user?.publicMetadata?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Verifying administrative access...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-extrabold text-white mb-8">Admin Dashboard</h1>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-900 mb-8 overflow-x-auto">
            {['overview', 'products', 'categories', 'orders', 'coupons'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3.5 px-6 font-semibold border-b-2 text-sm whitespace-nowrap capitalize transition-all ${
                  activeTab === tab
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'overview' ? 'Overview & Reports' : tab}
              </button>
            ))}
          </div>

          {/* TAB CONTENT: OVERVIEW & REPORTS */}
          {activeTab === 'overview' && (
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
                        ${stats.salesSummary.totalRevenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
                      <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Orders count</span>
                      <span className="block mt-2 text-2xl font-black text-white">
                        {stats.salesSummary.totalOrders}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
                      <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Products Catalog</span>
                      <span className="block mt-2 text-2xl font-black text-white">
                        {stats.salesSummary.totalProducts}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
                      <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">New Customers</span>
                      <span className="block mt-2 text-2xl font-black text-white">
                        {stats.salesSummary.totalCustomers}
                      </span>
                    </div>
                  </div>

                  {/* Revenue Chart */}
                  <div className="w-full">
                    <AdminChart data={stats.timeSeriesData || []} />
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
                              stats.lowStockProducts.map((v: any, index: number) => (
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
                          stats.bestSellers.map((item: any) => (
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
                      {stats.auditLogs.map((log: any) => (
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
          )}

          {/* TAB CONTENT: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Product list */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Manage Products</h3>
                  <button
                    onClick={exportProductsCsv}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg border border-slate-700 transition-colors"
                  >
                    📥 Export CSV
                  </button>
                </div>

                {loadingProducts ? (
                  <p className="text-slate-450 animate-pulse text-sm">Syncing catalog items...</p>
                ) : (
                  <div className="overflow-x-auto text-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-500 text-xs font-bold uppercase">
                          <th className="pb-3">Product Name</th>
                          <th className="pb-3">Category</th>
                          <th className="pb-3">Base Price</th>
                          <th className="pb-3 text-center">Variants</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((prod) => (
                          <tr key={prod.id} className="border-b border-slate-900/40">
                            <td className="py-3 font-semibold text-white">
                              {prod.name}
                              {prod.status === 'disabled' && (
                                <span className="ml-2 rounded bg-red-500/10 border border-red-500/20 px-1 text-[9px] font-bold uppercase text-red-400">
                                  Disabled
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-slate-450">{prod.category?.name}</td>
                            <td className="py-3 text-slate-350">${prod.basePrice.toFixed(2)}</td>
                            <td className="py-3 text-center text-slate-400">
                              {prod.variants?.length || 0} options
                            </td>
                            <td className="py-3 text-right space-x-3 font-bold text-xs">
                              <button
                                onClick={() => handleOpenVariantsModal(prod)}
                                className="text-violet-400 hover:text-violet-300"
                              >
                                Options ({prod.variants?.length || 0})
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                disabled={prod.status === 'disabled'}
                                className={`text-red-400 hover:text-red-300 ${
                                  prod.status === 'disabled' ? 'opacity-40 cursor-not-allowed' : ''
                                }`}
                              >
                                Disable
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add Product Form */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 h-fit">
                <h3 className="text-lg font-bold text-white mb-4">Add New Product</h3>
                <form onSubmit={handleCreateProduct} className="space-y-4 text-sm">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Product Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Elite Luxury Watch"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Description</label>
                    <textarea
                      required
                      placeholder="Enter specifications..."
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-slate-200 focus:outline-none h-16 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Brand Name</label>
                      <input
                        type="text"
                        placeholder="Veloce"
                        value={newProduct.brand}
                        onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Category</label>
                      <select
                        required
                        value={newProduct.categoryId}
                        onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-slate-300 focus:outline-none"
                      >
                        <option value="">Select</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Base Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="299.99"
                        value={newProduct.basePrice}
                        onChange={(e) => setNewProduct({ ...newProduct, basePrice: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Flat Discount ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="50.00"
                        value={newProduct.discountPrice}
                        onChange={(e) => setNewProduct({ ...newProduct, discountPrice: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="text-[10px] font-semibold text-slate-400">Threshold</label>
                      <input
                        type="number"
                        value={newProduct.lowStockThreshold}
                        onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-3 py-2.5 text-slate-200 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-semibold text-slate-400">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="1.2"
                        value={newProduct.weight}
                        onChange={(e) => setNewProduct({ ...newProduct, weight: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-3 py-2.5 text-slate-200 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-semibold text-slate-400">Dimensions</label>
                      <input
                        type="text"
                        placeholder="10x5x2 cm"
                        value={newProduct.dimensions}
                        onChange={(e) => setNewProduct({ ...newProduct, dimensions: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-3 py-2.5 text-slate-200 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400">Image URL</label>
                    <input
                      type="url"
                      placeholder="https://unsplash.com/..."
                      value={newProduct.imageUrl}
                      onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-slate-200 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full mt-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-bold text-white shadow-xl hover:opacity-95 transition-opacity"
                  >
                    Add Product
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB CONTENT: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Categories list */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
                <h3 className="text-lg font-bold text-white mb-6">Manage Categories</h3>

                {loadingCategories ? (
                  <p className="text-slate-450 animate-pulse text-sm">Syncing scopes...</p>
                ) : (
                  <div className="overflow-x-auto text-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-500 text-xs font-bold uppercase">
                          <th className="pb-3">Category ID</th>
                          <th className="pb-3">Name</th>
                          <th className="pb-3">Products Count</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((cat) => (
                          <tr key={cat.id} className="border-b border-slate-900/40">
                            <td className="py-3 font-semibold text-white">#{cat.id}</td>
                            <td className="py-3 text-slate-350">{cat.name}</td>
                            <td className="py-3 text-slate-400">{(cat as any)._count?.products || 0}</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
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

              {/* Add Category Form */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 h-fit">
                <h3 className="text-lg font-bold text-white mb-4">Add New Category</h3>
                <form onSubmit={handleCreateCategory} className="space-y-4 text-sm">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Category Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Smartphones"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Description (Optional)</label>
                    <textarea
                      placeholder="Latest handheld devices..."
                      value={newCategoryDesc}
                      onChange={(e) => setNewCategoryDesc(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-slate-200 focus:outline-none h-20 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full mt-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-bold text-white shadow-xl hover:opacity-95 transition-opacity"
                  >
                    Add Category
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB CONTENT: ORDERS */}
          {activeTab === 'orders' && (
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
                            <span className="block text-slate-200 font-semibold">{(ord as any).user?.name}</span>
                            <span className="text-xs text-slate-550">{(ord as any).user?.email}</span>
                          </td>
                          <td className="py-4 text-slate-400">
                            {ord.items.map((item: any) => (
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
          )}

          {/* TAB CONTENT: COUPONS */}
          {activeTab === 'coupons' && (
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
                              {(c as any)._count?.usages || 0} {c.usageLimit ? `/ ${c.usageLimit}` : ''}
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
          )}

          {/* Product Variants Options Modal dialog */}
          {variantModalProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-900 bg-slate-900 p-6 shadow-2xl relative">
                <button
                  onClick={() => {
                    setVariantModalProduct(null);
                    loadProducts(); // Sync stock totals on close
                  }}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold"
                >
                  ✕
                </button>

                <h3 className="text-lg font-bold text-white mb-1">Manage Variants</h3>
                <p className="text-xs text-slate-455 mb-6">Product: {variantModalProduct.name}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Current Variants list */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">Active Options</h4>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-2 text-xs">
                      {variantModalProduct.variants && variantModalProduct.variants.length > 0 ? (
                        variantModalProduct.variants.map((v: ProductVariant & { threshold?: number }) => (
                          <div key={v.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-850">
                            <div>
                              <span className="font-bold text-white block">{v.size || 'No Size'} / {v.color || 'No Color'}</span>
                              <span className="text-[10px] text-slate-500 font-mono">SKU: {v.sku} • Stock: {v.stock}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteVariant(v.id)}
                              className="text-red-400 hover:text-red-300 font-bold ml-4"
                            >
                              Delete
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 text-center py-6">No variant options defined.</p>
                      )}
                    </div>
                  </div>

                  {/* Add variant option Form */}
                  <form onSubmit={handleAddVariantSubmit} className="space-y-4 text-xs font-semibold">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2 font-mono">Add Option</h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-400">SKU Code</label>
                        <input
                          type="text"
                          required
                          value={variantSku}
                          onChange={(e) => setVariantSku(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-2.5 py-2 text-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Stock Qty</label>
                        <input
                          type="number"
                          required
                          value={variantStock}
                          onChange={(e) => setVariantStock(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-2.5 py-2 text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">Size</label>
                        <input
                          type="text"
                          placeholder="M"
                          value={variantSize}
                          onChange={(e) => setVariantSize(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-2 py-2 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Color</label>
                        <input
                          type="text"
                          placeholder="Black"
                          value={variantColor}
                          onChange={(e) => setVariantColor(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-2 py-2 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Material</label>
                        <input
                          type="text"
                          placeholder="Leather"
                          value={variantMaterial}
                          onChange={(e) => setVariantMaterial(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-950 px-2 py-2 text-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Price Override (Optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Leave blank to use base"
                        value={variantPrice}
                        onChange={(e) => setVariantPrice(e.target.value)}
                        className="w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-2 text-slate-200"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-violet-605 hover:bg-violet-600 py-2.5 text-center text-white"
                    >
                      Save Option
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
