'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import ProductSkeleton from '@/components/skeletons/ProductSkeleton';
import CategorySkeleton from '@/components/skeletons/CategorySkeleton';
import {
  FadeIn,
  GradientMesh,
  MagneticLink,
  Stagger,
  StaggerItem,
  EmptyState,
} from '@/components/motion';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '@/lib/api';
import { Category, Product } from '@/types';

export default function Home() {
  const [categories, setCategories] = useState<(Category & { _count?: { products: number } })[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const reduced = useReducedMotion();

  useEffect(() => {
    async function loadHomeData() {
      try {
        const cats = await api.get<(Category & { _count?: { products: number } })[]>('/categories');
        setCategories(cats.slice(0, 4));

        const prodData = await api.get<{ products?: Product[] }>('/products?limit=8');
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
    <div className="flex min-h-screen flex-col bg-bg-base">
      <Header />

      <main id="main-content" className="flex-1" tabIndex={-1}>
        <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
          <GradientMesh intensity="medium" />

          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0.12 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl text-center"
          >
            <h1 className="text-4xl font-extrabold tracking-tight text-text-main sm:text-6xl">
              The Future of{' '}
              <span className="text-primary">Premium Shopping</span>
            </h1>
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduced
                  ? { duration: 0.12 }
                  : { duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }
              }
              className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-muted"
            >
              Explore our handpicked curation of elite fashion, timeless accessories, and
              groundbreaking gadgets. Designed for the bold.
            </motion.p>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduced
                  ? { duration: 0.12 }
                  : { duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }
              }
              className="mt-10 flex items-center justify-center gap-6"
            >
              <MagneticLink href="/products">Shop Collection</MagneticLink>
              <a
                href="#featured"
                className="rounded-md px-3 py-1 text-base font-semibold leading-6 text-text-muted transition-colors duration-200 hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-main"
              >
                Learn more <span aria-hidden="true">→</span>
              </a>
            </motion.div>
          </motion.div>
        </section>

        <section className="border-y border-border bg-surface/50 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn className="mb-10 text-center md:text-left">
              <h2 className="text-2xl font-extrabold text-text-main">Browse by Category</h2>
              <p className="mt-1 text-sm text-text-muted">
                Discover collections tailored to your lifestyle.
              </p>
            </FadeIn>

            {loading ? (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <CategorySkeleton key={i} />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <Stagger className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {categories.map((category) => (
                  <StaggerItem key={category.id}>
                    <Link
                      href={`/products?categoryId=${category.id}`}
                      className="group flex flex-col items-center justify-center rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-secondary hover:bg-surface/80 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <h3 className="text-base font-bold text-text-main transition-colors group-hover:text-primary">
                        {category.name}
                      </h3>
                      <span className="mt-1.5 text-xs text-text-muted">
                        {category._count?.products || 0} Products
                      </span>
                    </Link>
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <EmptyState
                title="No categories yet"
                description="Sign in as Admin to create your first collection."
              />
            )}
          </div>
        </section>

        <section id="featured" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn className="mb-12 flex flex-col justify-between md:flex-row md:items-end">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-extrabold text-text-main">Featured Products</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Handpicked items from our premium catalog.
                </p>
              </div>
              <Link
                href="/products"
                className="mt-4 hidden items-center rounded-md px-2 py-1 text-sm font-semibold text-primary transition-colors hover:text-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:mt-0 md:flex"
              >
                View all items <span className="ml-1">→</span>
              </Link>
            </FadeIn>

            {loading ? (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            ) : featuredProducts.length > 0 ? (
              <Stagger className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
                {featuredProducts.map((product) => (
                  <StaggerItem key={product.id}>
                    <ProductCard product={product} />
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <EmptyState
                title="No products found"
                description="The catalog is empty. Add products from the admin panel."
                action={
                  <Link
                    href="/sign-in"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-bg-base shadow-md transition-all active:scale-[0.97]"
                  >
                    Sign in as Admin
                  </Link>
                }
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
