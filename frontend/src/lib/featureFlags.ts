/** Lightweight client feature flags for motion rollout. */
export const flags = {
  motionPrimitives: true,
  gradientMesh: true,
  confettiSuccess: true,
  magneticCta: true,
  pageTransitions: false,
  freeShippingProgress: false,
} as const;

export type FeatureFlags = typeof flags;
