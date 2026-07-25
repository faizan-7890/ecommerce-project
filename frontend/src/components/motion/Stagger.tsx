'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { fadeUp, reducedFade, staggerContainer } from '@/lib/motion/variants';
import { cn } from '@/lib/cn';

type StaggerProps = {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
};

export function Stagger({ children, className, once = true }: StaggerProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      variants={reduced ? undefined : staggerContainer}
      initial={reduced ? false : 'hidden'}
      whileInView={reduced ? undefined : 'show'}
      animate={reduced ? undefined : undefined}
      viewport={{ once, margin: '-8%' }}
    >
      {children}
    </motion.div>
  );
}

type StaggerItemProps = {
  children: React.ReactNode;
  className?: string;
};

/** Direct motion child for Stagger containers. */
export function StaggerItem({ children, className }: StaggerItemProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      variants={reduced ? reducedFade : fadeUp}
    >
      {children}
    </motion.div>
  );
}
