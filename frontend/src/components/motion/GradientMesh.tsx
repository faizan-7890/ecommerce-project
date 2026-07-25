'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { flags } from '@/lib/featureFlags';
import { cn } from '@/lib/cn';

type Intensity = 'low' | 'medium' | 'high';

const intensityMap: Record<Intensity, string> = {
  low: 'opacity-40',
  medium: 'opacity-70',
  high: 'opacity-100',
};

export function GradientMesh({
  intensity = 'medium',
  className,
}: {
  intensity?: Intensity;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (!flags.gradientMesh) return null;

  const drift = !reduced;

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
      aria-hidden
    >
      <motion.div
        className={cn(
          'absolute top-1/4 left-1/2 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-from/20 blur-3xl',
          intensityMap[intensity]
        )}
        animate={
          drift
            ? { x: [0, 30, -20, 0], y: [0, -20, 15, 0] }
            : undefined
        }
        transition={
          drift
            ? { duration: 14, repeat: Infinity, ease: 'easeInOut' }
            : undefined
        }
      />
      <motion.div
        className={cn(
          'absolute top-16 left-10 h-40 w-40 rounded-full bg-primary/15 blur-2xl',
          intensityMap[intensity]
        )}
        animate={drift ? { x: [0, 15, 0], y: [0, 20, 0] } : undefined}
        transition={
          drift
            ? { duration: 11, repeat: Infinity, ease: 'easeInOut' }
            : undefined
        }
      />
      <motion.div
        className={cn(
          'absolute bottom-10 right-10 h-48 w-48 rounded-full bg-accent-to/15 blur-3xl',
          intensityMap[intensity]
        )}
        animate={drift ? { x: [0, -25, 0], y: [0, -10, 0] } : undefined}
        transition={
          drift
            ? { duration: 16, repeat: Infinity, ease: 'easeInOut' }
            : undefined
        }
      />
    </div>
  );
}
