'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { AdminCategory } from '@/types';
import { getErrorMessage } from '@/lib/errors';

export default function CategoriesTab() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await api.get<AdminCategory[]>('/admin/categories');
      setCategories(data);
    } catch (err) {
      console.error('Error fetching admin categories', err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCategories(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCategories]);

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
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to create category'), 'error');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${categoryId}`);
      addToast('Category deleted successfully', 'success');
      loadCategories();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to delete category'), 'error');
    }
  };

  return (
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
                    <td className="py-3 text-slate-400">{cat.productCount}</td>
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
  );
}
