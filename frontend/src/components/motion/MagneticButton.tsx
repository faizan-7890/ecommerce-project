'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { flags } from '@/lib/featureFlags';

type MagneticButtonProps = {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  href?: string;
  type?: 'button' | 'submit';
  onClick?: React.MouseEventHandler;
  disabled?: boolean;
};

function useFinePointerHover(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (hover: hover)');
    const update = () => setOk(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return ok;
}

export function MagneticButton({
  children,
  className,
  strength = 8,
  href,
  type = 'button',
  onClick,
  disabled,
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const finePointer = useFinePointerHover();
  const enabled =
    flags.magneticCta && !reduced && finePointer && !disabled && strength > 0;
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMove = (e: React.MouseEvent) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setOffset({
      x: (x / (rect.width / 2)) * strength,
      y: (y / (rect.height / 2)) * strength,
    });
  };

  const onLeave = () => setOffset({ x: 0, y: 0 });

  const classes = cn(
    'inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-bg-base shadow-xl shadow-primary/20 transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:opacity-50',
    className
  );

  const motionProps = {
    ref: ref as React.Ref<HTMLElement>,
    className: classes,
    onMouseMove: onMove,
    onMouseLeave: onLeave,
    animate: enabled ? { x: offset.x, y: offset.y } : { x: 0, y: 0 },
    transition: { type: 'spring' as const, stiffness: 280, damping: 22, mass: 0.4 },
    whileTap: disabled ? undefined : { scale: 0.97 },
  };

  if (href) {
    return (
      <motion.div style={{ display: 'inline-flex' }}>
        <motion.a
          href={href}
          {...(motionProps as object)}
          ref={ref as React.Ref<HTMLAnchorElement>}
          onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
        >
          {/* Use Next Link semantics via router-friendly anchor; wrap for magnetic */}
          {children}
        </motion.a>
      </motion.div>
    );
  }

  // Prefer Next Link when href is internal path
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes}
      ref={ref as React.Ref<HTMLButtonElement>}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      animate={enabled ? { x: offset.x, y: offset.y } : { x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22, mass: 0.4 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
    >
      {children}
    </motion.button>
  );
}

/** Magnetic CTA that uses Next.js Link for client navigation. */
export function MagneticLink({
  href,
  children,
  className,
  strength = 8,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const reduced = useReducedMotion();
  const finePointer = useFinePointerHover();
  const enabled = flags.magneticCta && !reduced && finePointer && strength > 0;
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMove = (e: React.MouseEvent) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setOffset({
      x: (x / (rect.width / 2)) * strength,
      y: (y / (rect.height / 2)) * strength,
    });
  };

  return (
    <motion.div
      animate={enabled ? { x: offset.x, y: offset.y } : { x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22, mass: 0.4 }}
      onMouseMove={onMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      className="inline-flex"
    >
      <Link
        ref={ref}
        href={href}
        className={cn(
          'inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-bg-base shadow-xl shadow-primary/20 transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base active:scale-[0.97]',
          className
        )}
      >
        {children}
      </Link>
    </motion.div>
  );
}
