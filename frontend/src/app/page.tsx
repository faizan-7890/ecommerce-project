'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import ProductSkeleton from '@/components/skeletons/ProductSkeleton';
import CategorySkeleton from '@/components/skeletons/CategorySkeleton';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Category, Product } from '@/types';

export default function Home() {
  const [categories, setCategories] = useState<(Category & { _count?: { products: number } })[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const cats = await api.get<any[]>('/categories');
        setCategories(cats.slice(0, 4));

        const prodData = await api.get<{ products?: any[] }>('/products?limit=8');
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
    <div className="flex flex-col min-h-screen bg-bg-base">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8">
          {/* Decorative Backdrops */}
          <div className="absolute top-1/4 left-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-12 left-12 -z-10 h-32 w-32 rounded-full bg-secondary/10 blur-2xl" />
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-4xl text-center"
          >
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-text-main">
              The Future of{' '}
              <span className="text-primary">
                Premium Shopping
              </span>
            </h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="mt-6 text-lg text-text-muted max-w-2xl mx-auto leading-relaxed"
            >
              Explore our handpicked curation of elite fashion, timeless accessories, and groundbreaking gadgets. Designed for the bold.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="mt-10 flex items-center justify-center gap-6"
            >
              <Link
                href="/products"
                className="rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-bg-base shadow-xl shadow-primary/20 hover:bg-yellow-400 hover:shadow-primary/30 transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
              >
                Shop Collection
              </Link>
              <a
                href="#featured"
                className="text-base font-semibold leading-6 text-text-muted hover:text-text-main transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-main rounded-md px-3 py-1"
              >
                Learn more <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* Categories Section */}
        <section className="py-16 bg-surface/50 border-y border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center md:text-left mb-10">
              <h2 className="text-2xl font-extrabold text-text-main">Browse by Category</h2>
              <p className="mt-1 text-sm text-text-muted">Discover collections tailored to your lifestyle.</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <CategorySkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/products?categoryId=${category.id}`}
                      className="group flex flex-col items-center justify-center p-6 rounded-2xl border border-border bg-surface hover:bg-surface/80 hover:border-secondary transition-all duration-300 hover:shadow-lg hover:-translate-y-1 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <h3 className="text-base font-bold text-text-main group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                      <span className="mt-1.5 text-xs text-text-muted">
                        {category._count?.products || 0} Products
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-4 p-8 text-center rounded-2xl border border-dashed border-border bg-surface/50 text-text-muted">
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
                <h2 className="text-3xl font-extrabold text-text-main">Featured Products</h2>
                <p className="mt-2 text-sm text-text-muted">Handpicked items from our premium catalog.</p>
              </div>
              <Link
                href="/products"
                className="hidden md:flex items-center text-sm font-semibold text-primary hover:text-yellow-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-2 py-1"
              >
                View all items <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => (
                  <ProductSkeleton key={i} />
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
                  <div className="p-16 text-center rounded-2xl border border-dashed border-border bg-surface/50">
                    <p className="text-text-muted mb-6">No products found in the catalog.</p>
                    {categories.length > 0 && (
                      <Link
                        href="/login"
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-bg-base shadow-md transition-all active:scale-[0.97]"
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
