'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

type AnimatedBadgeProps = {
  count: number;
  className?: string;
  tone?: 'primary' | 'danger' | 'accent';
};

const toneClass = {
  primary: 'bg-primary text-bg-base',
  danger: 'bg-danger text-white',
  accent: 'bg-gradient-to-r from-accent-from via-accent-via to-accent-to text-white',
};

export function AnimatedBadge({
  count,
  className,
  tone = 'primary',
}: AnimatedBadgeProps) {
  const reduced = useReducedMotion();
  if (count <= 0) return null;

  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={count}
        initial={reduced ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={reduced ? undefined : { scale: 0.6, opacity: 0 }}
        transition={
          reduced
            ? { duration: 0.12 }
            : { type: 'spring', stiffness: 400, damping: 18 }
        }
        className={cn(
          'absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-extrabold shadow-md',
          toneClass[tone],
          className
        )}
      >
        {count > 99 ? '99+' : count}
      </motion.span>
    </AnimatePresence>
  );
}
