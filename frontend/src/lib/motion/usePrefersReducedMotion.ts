'use client';

import { useReducedMotion } from 'framer-motion';

/**
 * Prefer Framer's hook under MotionConfig reducedMotion="user".
 * Returns true when the user prefers reduced motion (after hydration).
 */
export function usePrefersReducedMotion(): boolean {
  return Boolean(useReducedMotion());
}
