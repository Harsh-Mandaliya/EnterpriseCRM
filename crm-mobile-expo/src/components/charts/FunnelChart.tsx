import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { motion, useReducedMotion } from '@/components/motion/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface FunnelStep {
  label: string;
  value: number;
  color: string;
  /** Optional secondary text, e.g. a money value. */
  detail?: string;
}

/**
 * Horizontal funnel: each step's bar width is relative to the
 * widest step, with the drop-off to the next step shown.
 */
export function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const theme = useTheme();
  const max = Math.max(1, ...steps.map(s => s.value));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Funnel. ${steps.map(s => `${s.label}: ${s.value}`).join(', ')}`}
      style={{ gap: 10 }}
    >
      {steps.map((step, index) => {
        const next = steps[index + 1];
        const conversion = next && step.value > 0 ? Math.round((next.value / step.value) * 100) : null;
        return (
          <View key={step.label}>
            <View style={styles.header}>
              <Text style={[styles.label, { color: theme.colors.text }]}>{step.label}</Text>
              <Text style={[styles.value, { color: theme.colors.textSecondary }]}>
                {step.value}
                {step.detail ? `  ·  ${step.detail}` : ''}
              </Text>
            </View>
            <FunnelBar ratio={step.value / max} color={step.color} index={index} />
            {conversion !== null ? (
              <Text style={[styles.conversion, { color: theme.colors.textFaint }]}>↓ {conversion}% continue</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function FunnelBar({ ratio, color, index }: { ratio: number; color: string; index: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const grow = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      grow.setValue(1);
      return;
    }
    grow.setValue(0);
    Animated.timing(grow, {
      toValue: 1,
      duration: motion.duration.slow + 150,
      delay: index * 90,
      easing: motion.easing.out,
      useNativeDriver: false,
    }).start();
  }, [grow, index, ratio, reduced]);

  return (
    <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: grow.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${Math.max(ratio > 0 ? 4 : 0, ratio * 100)}%`],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 13, fontWeight: '700' },
  value: { fontSize: 12, fontWeight: '600' },
  track: { height: 14, borderRadius: 7, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 7 },
  conversion: { fontSize: 11, marginTop: 3 },
});
