/**
 * Structural + behavioral tests for shipped motion foundation modules.
 */
import { describe, expect, it } from 'vitest';
import { cn } from '../cn';
import { flags } from '../featureFlags';
import { fadeUp, staggerContainer, transitions } from '../motion/variants';

describe('cn', () => {
  it('joins truthy class parts only', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
    expect(cn()).toBe('');
    expect(cn('rounded-xl', 'bg-primary')).toBe('rounded-xl bg-primary');
  });
});

describe('feature flags', () => {
  it('expose the motion rollout defaults', () => {
    expect(flags).toMatchObject({
      motionPrimitives: true,
      gradientMesh: true,
      confettiSuccess: true,
      magneticCta: true,
      pageTransitions: true,
      freeShippingProgress: false,
    });
  });
});

describe('motion variants', () => {
  it('fadeUp moves from hidden and offset to visible and in place', () => {
    expect(fadeUp.hidden).toMatchObject({ opacity: 0, y: 16 });
    expect(fadeUp.show).toMatchObject({ opacity: 1, y: 0 });
  });

  it('staggers children by 0.05s', () => {
    const show = staggerContainer.show as { transition?: { staggerChildren?: number } };
    expect(show.transition?.staggerChildren).toBe(0.05);
  });

  it('exports spring and base transitions', () => {
    expect(transitions.spring.type).toBe('spring');
    expect(typeof transitions.base.duration).toBe('number');
  });
});
