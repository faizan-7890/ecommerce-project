'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Selected tab: overview, products, categories, orders
  const [activeTab, setActiveTab] = useState('overview');

  // Stats State
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Products State
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    discount: '',
    stock: '',
    categoryId: '',
    imageUrl: '',
  });

  // Categories State
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user]);

  // Load Data based on Active Tab
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;

    if (activeTab === 'overview') {
      loadStats();
    } else if (activeTab === 'products') {
      loadProducts();
      loadCategories();
    } else if (activeTab === 'categories') {
      loadCategories();
    } else if (activeTab === 'orders') {
      loadAllOrders();
    }
  }, [activeTab, user]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await api.get('/admin/stats');
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
      const data = await api.get('/products?limit=100'); // Load bulk products
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
      const data = await api.get('/categories');
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
      const data = await api.get('/admin/orders');
      setOrders(data);
    } catch (err) {
      console.error('Error fetching admin orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Actions: Products
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.description || !newProduct.price || !newProduct.categoryId) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const imagesArray = newProduct.imageUrl ? [newProduct.imageUrl] : [];
      await api.post('/products', {
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        discount: newProduct.discount ? parseFloat(newProduct.discount) : 0,
        stock: newProduct.stock ? parseInt(newProduct.stock) : 0,
        categoryId: parseInt(newProduct.categoryId),
        images: imagesArray,
      });

      alert('Product created successfully!');
      setNewProduct({
        name: '',
        description: '',
        price: '',
        discount: '',
        stock: '',
        categoryId: '',
        imageUrl: '',
      });
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${productId}`);
      alert('Product deleted successfully');
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  // Actions: Categories
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) {
      alert('Please enter a category name');
      return;
    }

    try {
      await api.post('/categories', {
        name: newCategoryName,
        description: newCategoryDesc,
      });

      alert('Category created successfully!');
      setNewCategoryName('');
      setNewCategoryDesc('');
      loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${categoryId}`);
      alert('Category deleted successfully');
      loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  // Actions: Orders
  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status });
      alert(`Order status updated to '${status}'`);
      loadAllOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-slate-950">
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
            {['overview', 'products', 'categories', 'orders'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3.5 px-6 font-semibold border-b-2 text-sm whitespace-nowrap capitalize transition-all ${
                  activeTab === tab
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* TAB CONTENT: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {loadingStats ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl bg-slate-900/40 border border-slate-900 animate-pulse" />
                  ))}
                </div>
              ) : stats ? (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
                      <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Sales</span>
                      <span className="block mt-2 text-2xl font-black text-white">
                        ${stats.salesSummary.totalRevenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
                      <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Orders</span>
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
                      <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Customers</span>
                      <span className="block mt-2 text-2xl font-black text-white">
                        {stats.salesSummary.totalCustomers}
                      </span>
                    </div>
                  </div>

                  {/* Tables grids */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Orders */}
                    <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Recent 5 Orders</h3>
                      <div className="overflow-x-auto text-sm">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-slate-900 text-slate-500 text-xs uppercase font-bold">
                              <th className="pb-3">Order</th>
                              <th className="pb-3">Customer</th>
                              <th className="pb-3">Total</th>
                              <th className="pb-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.recentOrders.map((ord: any) => (
                              <tr key={ord.id} className="border-b border-slate-900/50">
                                <td className="py-3 font-semibold text-white">#000{ord.id}</td>
                                <td className="py-3 text-slate-400">{ord.user?.name}</td>
                                <td className="py-3 text-slate-350">${parseFloat(ord.total).toFixed(2)}</td>
                                <td className="py-3 text-right font-bold text-xs uppercase text-violet-400">
                                  {ord.status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Sales by Category */}
                    <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Category Sales Share</h3>
                      <div className="space-y-4">
                        {stats.categoryStats.map((cat: any) => (
                          <div key={cat.id} className="flex justify-between items-center text-sm">
                            <div>
                              <span className="font-bold text-white block">{cat.name}</span>
                              <span className="text-xs text-slate-500">{cat.itemsSold} units sold</span>
                            </div>
                            <span className="font-black text-violet-400">${cat.sales.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-slate-400">Failed to render dashboard summaries.</p>
              )}
            </div>
          )}

          {/* TAB CONTENT: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Product list */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-900 bg-slate-900/40 p-6">
                <h3 className="text-lg font-bold text-white mb-6">Manage Products</h3>

                {loadingProducts ? (
                  <p className="text-slate-450 animate-pulse text-sm">Syncing catalog items...</p>
                ) : (
                  <div className="overflow-x-auto text-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-500 text-xs font-bold uppercase">
                          <th className="pb-3">Product</th>
                          <th className="pb-3">Price</th>
                          <th className="pb-3">Stock</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((prod) => (
                          <tr key={prod.id} className="border-b border-slate-900/40">
                            <td className="py-3 font-semibold text-white">{prod.name}</td>
                            <td className="py-3 text-slate-350">${parseFloat(prod.price).toFixed(2)}</td>
                            <td className={`py-3 font-bold ${prod.stock > 0 ? 'text-emerald-450' : 'text-red-400'}`}>
                              {prod.stock}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
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

              {/* Add Product Form */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 h-fit">
                <h3 className="text-lg font-bold text-white mb-4">Add New Product</h3>
                <form onSubmit={handleCreateProduct} className="space-y-4 text-sm">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Name</label>
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
                      className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-slate-200 focus:outline-none h-20 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="299.99"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Discount (%)</label>
                      <input
                        type="number"
                        placeholder="10.00"
                        value={newProduct.discount}
                        onChange={(e) => setNewProduct({ ...newProduct, discount: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Stock Quantity</label>
                      <input
                        type="number"
                        placeholder="50"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
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
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
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
                            <td className="py-3 text-slate-400">{cat._count?.products || 0}</td>
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
              <h3 className="text-lg font-bold text-white mb-6">System Orders</h3>

              {loadingOrders ? (
                <p className="text-slate-450 animate-pulse text-sm">Syncing orders feed...</p>
              ) : (
                <div className="overflow-x-auto text-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-500 text-xs font-bold uppercase">
                        <th className="pb-3">Order</th>
                        <th className="pb-3">User</th>
                        <th className="pb-3">Items</th>
                        <th className="pb-3">Total Charged</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((ord) => (
                        <tr key={ord.id} className="border-b border-slate-900/40">
                          <td className="py-4 font-bold text-white">#000{ord.id}</td>
                          <td className="py-4">
                            <span className="block text-slate-200 font-semibold">{ord.user?.name}</span>
                            <span className="text-xs text-slate-500">{ord.user?.email}</span>
                          </td>
                          <td className="py-4 text-slate-400">
                            {ord.items.map((item: any) => (
                              <span key={item.id} className="block text-xs">
                                • {item.product?.name} <span className="text-slate-650">x{item.quantity}</span>
                              </span>
                            ))}
                          </td>
                          <td className="py-4 text-slate-350">${parseFloat(ord.total).toFixed(2)}</td>
                          <td className="py-4">
                            <span className={`rounded px-2.5 py-1 text-[10px] font-extrabold uppercase border ${
                              ord.status === 'delivered'
                                ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                                : ord.status === 'cancelled'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : ord.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                            }`}>
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <select
                              value={ord.status}
                              onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                              className="rounded-lg border border-slate-850 bg-slate-950 px-2 py-1 text-xs text-slate-300 focus:outline-none"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
