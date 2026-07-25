'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export function Shimmer({ className }: { className?: string }) {
  return <div className={cn('velo-shimmer rounded-md', className)} aria-hidden />;
}
