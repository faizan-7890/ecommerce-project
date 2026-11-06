'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { AdminCategory, Product } from '@/types';
import { exportToCsv } from '@/lib/exportCsv';
import { getErrorMessage } from '@/lib/errors';
import VariantsModal from './VariantsModal';

const EMPTY_PRODUCT = {
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
};

export default function ProductsTab() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const data = await api.get<Product[]>('/admin/products');
      setProducts(data);
    } catch (err) {
      console.error('Error fetching admin products', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.get<AdminCategory[]>('/admin/categories');
      setCategories(data);
    } catch (err) {
      console.error('Error fetching admin categories', err);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts();
      void loadCategories();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCategories, loadProducts]);

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
      setNewProduct(EMPTY_PRODUCT);
      loadProducts();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to create product'), 'error');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to disable this product?')) return;
    try {
      await api.delete(`/products/${productId}`);
      addToast('Product status toggled to inactive/disabled', 'info');
      loadProducts();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to disable product'), 'error');
    }
  };

  const exportProductsCsv = () => {
    const headers = ['ID', 'Name', 'Brand', 'Category', 'Base Price', 'Stock Level'];
    const rows = products.map((p) => [
      p.id,
      p.name,
      p.brand || '',
      p.category?.name || '',
      p.basePrice,
      p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0,
    ]);
    exportToCsv(`veloce_products_${Date.now()}`, headers, rows);
    addToast('Products inventory exported to CSV', 'success');
  };

  return (
    <>
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
                          onClick={() => setVariantModalProduct(prod)}
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

      {/* Product Variants Options Modal dialog */}
      {variantModalProduct && (
        <VariantsModal
          key={variantModalProduct.id}
          product={variantModalProduct}
          onClose={() => {
            setVariantModalProduct(null);
            loadProducts(); // Sync stock totals on close
          }}
        />
      )}
    </>
  );
}
