'use client';

import React from 'react';
import { Shimmer } from '@/components/motion';

export default function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface/40 p-6">
      <Shimmer className="h-5 w-24 rounded" />
      <Shimmer className="mt-3 h-3 w-16 rounded" />
    </div>
  );
}
