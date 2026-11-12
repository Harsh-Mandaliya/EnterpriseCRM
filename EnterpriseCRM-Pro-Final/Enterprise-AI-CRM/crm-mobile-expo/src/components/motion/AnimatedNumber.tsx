import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, type StyleProp, type TextStyle } from 'react-native';

import { motion, useReducedMotion } from '@/components/motion/motion';

/**
 * Counts up to `value` when it appears or changes.
 * The accessible label is always the final value.
 */
export function AnimatedNumber({
  value,
  format = v => Math.round(v).toLocaleString('en-IN'),
  style,
}: {
  value: number;
  format?: (value: number) => string;
  style?: StyleProp<TextStyle>;
}) {
  const reduced = useReducedMotion();
  const animated = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const id = animated.addListener(({ value: v }) => setDisplay(v));
    const animation = Animated.timing(animated, {
      toValue: value,
      duration: motion.duration.count,
      easing: motion.easing.out,
      // Text content cannot use the native driver.
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
      animated.removeListener(id);
    };
  }, [animated, reduced, value]);

  return (
    <Text style={style} accessibilityLabel={format(value)}>
      {format(display)}
    </Text>
  );
}

/** ₹1,23,456 / ₹4.2L / ₹1.3Cr — compact Indian currency. */
export function formatCompactCurrency(value: number, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : `${currency} `;
  const abs = Math.abs(value);
  if (currency === 'INR') {
    if (abs >= 1e7) return `${symbol}${(value / 1e7).toFixed(1).replace(/\.0$/, '')}Cr`;
    if (abs >= 1e5) return `${symbol}${(value / 1e5).toFixed(1).replace(/\.0$/, '')}L`;
  } else if (abs >= 1e6) {
    return `${symbol}${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (abs >= 1e3) return `${symbol}${(value / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return `${symbol}${Math.round(value).toLocaleString('en-IN')}`;
}
