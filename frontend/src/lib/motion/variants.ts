import type { Transition, Variants } from 'framer-motion';

export const easings = {
  out: [0.22, 1, 0.36, 1] as const,
};

export const transitions = {
  fast: { duration: 0.18, ease: easings.out } satisfies Transition,
  base: { duration: 0.28, ease: easings.out } satisfies Transition,
  spring: { type: 'spring', stiffness: 260, damping: 24 } satisfies Transition,
  softSpring: { type: 'spring', stiffness: 200, damping: 22 } satisfies Transition,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: transitions.base },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transitions.fast },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: transitions.spring },
};

export const drawerSlide = {
  hidden: { x: '100%' },
  show: { x: 0, transition: transitions.spring },
  exit: { x: '100%', transition: { duration: 0.22, ease: easings.out } },
};

/** Applied when useReducedMotion() === true */
export const reducedFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.12 } },
};
