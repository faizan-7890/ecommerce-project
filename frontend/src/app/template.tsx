'use client';

import { PageTransition } from '@/components/motion';

/** Remounts per navigation so page enter animations re-run (App Router). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
