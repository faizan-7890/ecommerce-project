'use client';

import React from 'react';
import { Shimmer } from '@/components/motion';

export default function ProductSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/40 p-4">
      <Shimmer className="aspect-square w-full rounded-xl" />
      <div className="mt-4 flex flex-1 flex-col space-y-3">
        <Shimmer className="h-3 w-1/3 rounded" />
        <Shimmer className="h-5 w-3/4 rounded" />
        <Shimmer className="h-4 w-full rounded" />
        <div className="mt-4 flex items-center justify-between">
          <Shimmer className="h-6 w-1/4 rounded" />
          <Shimmer className="h-10 w-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
