'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { flags } from '@/lib/featureFlags';
import { cn } from '@/lib/cn';

/** Soft page enter. Enable via flags.pageTransitions + app/template.tsx */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (!flags.pageTransitions) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced
          ? { duration: 0.12 }
          : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {children}
    </motion.div>
  );
}
