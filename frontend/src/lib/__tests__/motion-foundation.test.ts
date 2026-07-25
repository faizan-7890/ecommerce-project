/**
 * Structural + behavioral tests for shipped motion foundation modules.
 * Runs with node --experimental-strip-types or via a simple assert runner.
 */
import { cn } from '../cn';
import { flags } from '../featureFlags';
import { fadeUp, staggerContainer, transitions } from '../motion/variants';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

// cn joins truthy class parts only
assert(cn('a', false, null, undefined, 'b') === 'a b', 'cn should join truthy parts');
assert(cn() === '', 'cn empty should be empty string');
assert(cn('rounded-xl', 'bg-primary') === 'rounded-xl bg-primary', 'cn multi');

// feature flags expose required motion rollout keys
assert(flags.motionPrimitives === true, 'motionPrimitives default on');
assert(flags.gradientMesh === true, 'gradientMesh default on');
assert(flags.confettiSuccess === true, 'confettiSuccess default on');
assert(flags.magneticCta === true, 'magneticCta default on');
assert(flags.pageTransitions === false, 'pageTransitions default off');
assert(flags.freeShippingProgress === false, 'freeShippingProgress default off');

// variants export real Framer-compatible shapes used by primitives
assert(typeof fadeUp.hidden === 'object' && fadeUp.hidden !== null, 'fadeUp.hidden');
assert(typeof fadeUp.show === 'object' && fadeUp.show !== null, 'fadeUp.show');
const hidden = fadeUp.hidden as { opacity: number; y: number };
const show = fadeUp.show as { opacity: number; y: number };
assert(hidden.opacity === 0, 'fadeUp starts hidden opacity 0');
assert(hidden.y === 16, 'fadeUp starts y 16');
assert(show.opacity === 1, 'fadeUp show opacity 1');
assert(show.y === 0, 'fadeUp show y 0');

assert(
  typeof staggerContainer.show === 'object' &&
    (staggerContainer.show as { transition?: { staggerChildren?: number } }).transition
      ?.staggerChildren === 0.05,
  'staggerChildren is 0.05s'
);

assert(transitions.spring.type === 'spring', 'spring transition type');
assert(typeof transitions.base.duration === 'number', 'base duration number');

console.log('motion-foundation.test.ts: all assertions passed');
