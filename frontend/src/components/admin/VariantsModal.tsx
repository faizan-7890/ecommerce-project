'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Product, ProductVariant } from '@/types';
import { getErrorMessage } from '@/lib/errors';

function createVariantSku(name: string): string {
  return `${name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
}

interface VariantsModalProps {
  product: Product;
  onClose: () => void;
}

export default function VariantsModal({ product, onClose }: VariantsModalProps) {
  const { addToast } = useToast();
  const [variantModalProduct, setVariantModalProduct] = useState<Product>(product);
  const [variantSku, setVariantSku] = useState(() => createVariantSku(product.name));
  const [variantPrice, setVariantPrice] = useState('');
  const [variantStock, setVariantStock] = useState('10');
  const [variantSize, setVariantSize] = useState('');
  const [variantColor, setVariantColor] = useState('');
  const [variantMaterial, setVariantMaterial] = useState('');

  const handleAddVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantSku) return;

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
      const updatedProd = await api.get<Product>(`/products/${variantModalProduct.id}`);
      setVariantModalProduct(updatedProd);

      // Reset variant form fields
      setVariantSku(createVariantSku(updatedProd.name));
      setVariantPrice('');
      setVariantStock('10');
      setVariantSize('');
      setVariantColor('');
      setVariantMaterial('');
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to add variant'), 'error');
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (!confirm('Are you sure you want to delete this variant option?')) return;
    try {
      await api.delete(`/products/${variantModalProduct.id}/variants/${variantId}`);
      addToast('Variant deleted', 'info');
      const updatedProd = await api.get<Product>(`/products/${variantModalProduct.id}`);
      setVariantModalProduct(updatedProd);
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to delete variant'), 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-900 bg-slate-900 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
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
  );
}
