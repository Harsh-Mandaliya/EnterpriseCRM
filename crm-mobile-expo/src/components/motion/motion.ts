import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing, Platform } from 'react-native';

/* ============================================================
   MOTION TOKENS
   One place for durations and curves so every animation in the
   app feels like part of the same system.
============================================================ */

export const motion = {
  duration: {
    fast: 160,
    base: 260,
    slow: 420,
    count: 900,
  },
  easing: {
    out: Easing.out(Easing.cubic),
    inOut: Easing.inOut(Easing.cubic),
    spring: Easing.out(Easing.back(1.4)),
  },
  /** Delay between items in a staggered list. */
  stagger: 55,
  /** The native driver is not available on web. */
  useNativeDriver: Platform.OS !== 'web',
} as const;

/**
 * True when the user asked the OS to reduce motion. Every motion
 * component checks this and renders the final state instantly.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(value => mounted && setReduced(Boolean(value)))
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      value => setReduced(Boolean(value)),
    );

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  return reduced;
}
