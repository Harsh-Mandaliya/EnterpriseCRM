import React, { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { motion, useReducedMotion } from '@/components/motion/motion';

/**
 * Fades and slides its children in on mount. Pass `index` to
 * stagger items in a list.
 */
export function FadeInView({
  children,
  index = 0,
  delay = 0,
  from = 14,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  /** Initial vertical offset in px. */
  from?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.duration.slow,
      delay: delay + Math.min(index, 12) * motion.stagger,
      easing: motion.easing.out,
      useNativeDriver: motion.useNativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, index, progress, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [from, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
