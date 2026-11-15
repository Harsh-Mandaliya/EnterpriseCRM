import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

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
  // Bar under the mouse (web) or finger (touch); the others dim.
  const [active, setActive] = useState<number | null>(null);

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
            tip={`${d.label}: ${format(d.value)}`}
            active={active === index}
            dimmed={active !== null && active !== index}
            onActive={on => setActive(on ? index : null)}
          />
        ))}
      </View>
      <View style={styles.labels}>
        {data.map((d, index) => (
          <Text key={`${d.label}-${index}`} style={[styles.label, { color: active === index ? theme.colors.text : theme.colors.textMuted }, active === index && styles.labelActive]} numberOfLines={1}>
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
  tip,
  active,
  dimmed,
  onActive,
}: {
  ratio: number;
  height: number;
  color: string;
  index: number;
  valueLabel: string;
  tip: string;
  active: boolean;
  dimmed: boolean;
  onActive: (on: boolean) => void;
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
    <Pressable
      style={[styles.column, { opacity: dimmed ? 0.4 : 1 }]}
      onHoverIn={() => onActive(true)}
      onHoverOut={() => onActive(false)}
      onPressIn={() => onActive(true)}
      onPressOut={() => onActive(false)}
    >
      {active ? (
        <View style={[styles.tip, { backgroundColor: theme.colors.text }]}>
          <Text style={[styles.tipText, { color: theme.colors.background }]} numberOfLines={1}>
            {tip}
          </Text>
        </View>
      ) : (
        <Animated.Text style={[styles.value, { color: theme.colors.textSecondary, opacity: grow }]} numberOfLines={1}>
          {valueLabel}
        </Animated.Text>
      )}
      <Animated.View
        style={{
          width: active ? '74%' : '62%',
          maxWidth: active ? 40 : 34,
          height: grow.interpolate({ inputRange: [0, 1], outputRange: [0, barHeight] }),
          backgroundColor: color,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
        }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  value: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
  labels: { flexDirection: 'row', marginTop: 6 },
  label: { flex: 1, textAlign: 'center', fontSize: 11 },
  labelActive: { fontWeight: '800' },
  tip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, marginBottom: 4, alignItems: 'center' },
  tipText: { fontSize: 10, fontWeight: '800' },
});
