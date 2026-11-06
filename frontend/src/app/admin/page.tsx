'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useUser } from '@clerk/nextjs';
import OverviewTab from '@/components/admin/OverviewTab';
import ProductsTab from '@/components/admin/ProductsTab';
import CategoriesTab from '@/components/admin/CategoriesTab';
import OrdersTab from '@/components/admin/OrdersTab';
import CouponsTab from '@/components/admin/CouponsTab';

// Each tab owns its data and reloads it when mounted, i.e. every time it is selected.
const TABS = {
  overview: OverviewTab,
  products: ProductsTab,
  categories: CategoriesTab,
  orders: OrdersTab,
  coupons: CouponsTab,
} as const;

type TabName = keyof typeof TABS;

export default function AdminDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabName>('overview');

  // Redirect if not admin
  useEffect(() => {
    if (isLoaded && (!isSignedIn || user?.publicMetadata?.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, isLoaded, isSignedIn, router]);

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

  const ActiveTab = TABS[activeTab];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-extrabold text-white mb-8">Admin Dashboard</h1>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-900 mb-8 overflow-x-auto">
            {(Object.keys(TABS) as TabName[]).map((tab) => (
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

          <ActiveTab />
        </div>
      </main>

      <Footer />
    </div>
  );
}
