'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { api } from '@/lib/api';

export default function Home() {
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const cats = await api.get('/categories');
        setCategories(cats.slice(0, 4));

        const prodData = await api.get('/products?limit=8');
        setFeaturedProducts(prodData.products || []);
      } catch (err) {
        console.error('Failed to load home page data', err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8 bg-slate-950">
          {/* Decorative Gradients */}
          <div className="absolute top-1/4 left-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 blur-3xl" />
          <div className="absolute top-12 left-12 -z-10 h-32 w-32 rounded-full bg-violet-500/5 blur-2xl" />
          
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
              The Future of{' '}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
                Premium Shopping
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Explore our handpicked curation of elite fashion, timeless accessories, and groundbreaking gadgets. Designed for the bold.
            </p>
            <div className="mt-10 flex items-center justify-center gap-6">
              <Link
                href="/products"
                className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3.5 text-base font-semibold text-white shadow-xl shadow-violet-500/20 hover:opacity-90 transition-all duration-200 hover:-translate-y-0.5"
              >
                Shop Collection
              </Link>
              <a
                href="#featured"
                className="text-base font-semibold leading-6 text-slate-300 hover:text-white transition-colors duration-200"
              >
                Learn more <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-16 bg-slate-950/60 border-y border-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center md:text-left mb-10">
              <h2 className="text-2xl font-extrabold text-white">Browse by Category</h2>
              <p className="mt-1 text-sm text-slate-400">Discover collections tailored to your lifestyle.</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-900" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/products?categoryId=${category.id}`}
                      className="group flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-900 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                    >
                      <h3 className="text-base font-bold text-white group-hover:text-violet-400 transition-colors">
                        {category.name}
                      </h3>
                      <span className="mt-1.5 text-xs text-slate-500">
                        {category._count?.products || 0} Products
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-4 p-8 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-slate-400">
                    No categories configured yet. Sign in as Admin to create one!
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Featured Products */}
        <section id="featured" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-extrabold text-white">Featured Products</h2>
                <p className="mt-2 text-sm text-slate-400">Handpicked items from our premium catalog.</p>
              </div>
              <Link
                href="/products"
                className="hidden md:flex items-center text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
              >
                View all items <span className="ml-1">→</span>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col rounded-2xl bg-slate-900/40 p-4 border border-slate-900 animate-pulse h-96" />
                ))}
              </div>
            ) : (
              <div>
                {featuredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                    {featuredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="p-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20">
                    <p className="text-slate-400 mb-6">No products found in the catalog.</p>
                    {categories.length > 0 && (
                      <Link
                        href="/login"
                        className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-md"
                      >
                        Sign in as Admin to Add Products
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
