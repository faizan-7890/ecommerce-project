'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

type PressableProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler;
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
};

export function Pressable({
  children,
  className,
  onClick,
  disabled,
  type = 'button',
  title,
}: PressableProps) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(className)}
      whileTap={reduced || disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.button>
  );
}
