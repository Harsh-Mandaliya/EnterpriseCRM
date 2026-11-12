import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { motion, useReducedMotion } from '@/components/motion/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

/**
 * Vertical bar chart whose bars grow in on mount. Values are
 * also exposed to screen readers as one summary label.
 */
export function BarChart({
  data,
  height = 160,
  format = v => String(Math.round(v)),
  highlightLast,
}: {
  data: BarDatum[];
  height?: number;
  format?: (value: number) => string;
  highlightLast?: boolean;
}) {
  const theme = useTheme();
  const max = Math.max(1, ...data.map(d => d.value));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Bar chart. ${data.map(d => `${d.label}: ${format(d.value)}`).join(', ')}`}
    >
      <View style={[styles.plot, { height }]}>
        {data.map((d, index) => (
          <Bar
            key={`${d.label}-${index}`}
            index={index}
            ratio={d.value / max}
            height={height - 22}
            color={
              d.color ??
              (highlightLast && index === data.length - 1 ? theme.colors.accent : theme.colors.primary)
            }
            valueLabel={format(d.value)}
          />
        ))}
      </View>
      <View style={styles.labels}>
        {data.map((d, index) => (
          <Text key={`${d.label}-${index}`} style={[styles.label, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Bar({
  ratio,
  height,
  color,
  index,
  valueLabel,
}: {
  ratio: number;
  height: number;
  color: string;
  index: number;
  valueLabel: string;
}) {
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
      duration: motion.duration.slow + 200,
      delay: index * 70,
      easing: motion.easing.out,
      useNativeDriver: false,
    }).start();
  }, [grow, index, ratio, reduced]);

  const barHeight = Math.max(ratio > 0 ? 4 : 0, ratio * height);

  return (
    <View style={styles.column}>
      <Animated.Text style={[styles.value, { color: theme.colors.textSecondary, opacity: grow }]} numberOfLines={1}>
        {valueLabel}
      </Animated.Text>
      <Animated.View
        style={{
          width: '62%',
          maxWidth: 34,
          height: grow.interpolate({ inputRange: [0, 1], outputRange: [0, barHeight] }),
          backgroundColor: color,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  value: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
  labels: { flexDirection: 'row', marginTop: 6 },
  label: { flex: 1, textAlign: 'center', fontSize: 11 },
});
