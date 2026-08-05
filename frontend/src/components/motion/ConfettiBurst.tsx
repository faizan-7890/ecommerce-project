'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { flags } from '@/lib/featureFlags';

const DEFAULT_COLORS = [
  '#E2C044',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
  '#10b981',
  '#587B7F',
];

function seededValue(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

type ConfettiBurstProps = {
  active: boolean;
  colors?: string[];
  particleCount?: number;
  onComplete?: () => void;
};

export function ConfettiBurst({
  active,
  colors = DEFAULT_COLORS,
  particleCount = 24,
  onComplete,
}: ConfettiBurstProps) {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);
  const count = Math.min(Math.max(particleCount, 1), 40);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (seededValue(i * 5 + 1) - 0.5) * 320,
      y: -(80 + seededValue(i * 5 + 2) * 220),
      rotate: seededValue(i * 5 + 3) * 360,
      color: colors[i % colors.length],
      size: 6 + seededValue(i * 5 + 4) * 6,
      delay: seededValue(i * 5 + 5) * 0.15,
    }));
  }, [count, colors]);

  useEffect(() => {
    if (!active || !flags.confettiSuccess || reduced) {
      if (active && (reduced || !flags.confettiSuccess)) onComplete?.();
      return;
    }
    // Defer show to avoid sync setState in effect body lint
    const t = window.setTimeout(() => setShow(true), 0);
    const done = window.setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, 1400);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(done);
    };
  }, [active, reduced, onComplete]);

  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] flex items-start justify-center overflow-hidden pt-[20vh]"
      aria-hidden
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
          }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{
            opacity: [1, 1, 0],
            x: p.x,
            y: p.y,
            rotate: p.rotate,
            scale: [1, 1.1, 0.8],
          }}
          transition={{
            duration: 1.1,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}
