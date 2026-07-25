'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { fadeUp, reducedFade, transitions } from '@/lib/motion/variants';
import { cn } from '@/lib/cn';

type FadeInProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
};

export function FadeIn({
  children,
  className,
  delay = 0,
  y = 16,
  once = true,
}: FadeInProps) {
  const reduced = useReducedMotion();
  const variants = reduced
    ? reducedFade
    : {
        hidden: { opacity: 0, y },
        show: {
          opacity: 1,
          y: 0,
          transition: { ...transitions.base, delay },
        },
      };

  return (
    <motion.div
      className={cn(className)}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: '-10%' }}
    >
      {children}
    </motion.div>
  );
}
