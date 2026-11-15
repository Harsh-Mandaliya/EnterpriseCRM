import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { motion, useReducedMotion } from '@/components/motion/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * Donut chart that sweeps in clockwise, with the headline value in
 * the middle and a legend underneath.
 */
export function DonutChart({
  data,
  size = 150,
  thickness = 18,
  centerValue,
  centerLabel,
  showLegend = true,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
  showLegend?: boolean;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const sweep = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  // Slice under the mouse / finger (via its legend entry or the ring itself).
  const [active, setActive] = useState<string | null>(null);
  const activeSlice = data.find(d => d.label === active);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (reduced) {
      setProgress(1);
      return;
    }
    sweep.setValue(0);
    const id = sweep.addListener(({ value }) => setProgress(value));
    Animated.timing(sweep, {
      toValue: 1,
      duration: motion.duration.count,
      easing: motion.easing.out,
      useNativeDriver: false,
    }).start();
    return () => sweep.removeListener(id);
  }, [reduced, sweep, total]);

  let offset = 0;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${centerLabel ?? 'Chart'}: ${data
        .map(d => `${d.label} ${total > 0 ? Math.round((d.value / total) * 100) : 0}%`)
        .join(', ')}`}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.colors.surfaceAlt}
              strokeWidth={thickness}
              fill="none"
            />
            {total > 0
              ? data.map(slice => {
                  const length = (slice.value / total) * circumference * progress;
                  const element = (
                    <Circle
                      key={slice.label}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={slice.color}
                      strokeWidth={active === slice.label ? thickness + 6 : thickness}
                      opacity={active && active !== slice.label ? 0.3 : 1}
                      onPressIn={() => setActive(slice.label)}
                      onPressOut={() => setActive(null)}
                      strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`}
                      strokeDashoffset={-offset}
                      strokeLinecap="round"
                      fill="none"
                    />
                  );
                  offset += (slice.value / total) * circumference * progress;
                  return element;
                })
              : null}
          </G>
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          {activeSlice ? (
            <>
              <Text style={[styles.centerValue, { color: activeSlice.color }]}>{total > 0 ? Math.round((activeSlice.value / total) * 100) : 0}%</Text>
              <Text style={[styles.centerLabel, { color: theme.colors.textMuted }]} numberOfLines={1}>
                {activeSlice.label} · {activeSlice.value}
              </Text>
            </>
          ) : (
            <>
              {centerValue ? <Text style={[styles.centerValue, { color: theme.colors.text }]}>{centerValue}</Text> : null}
              {centerLabel ? <Text style={[styles.centerLabel, { color: theme.colors.textMuted }]}>{centerLabel}</Text> : null}
            </>
          )}
        </View>
      </View>

      {showLegend ? (
        <View style={styles.legend}>
          {data.map(slice => (
            <Pressable
              key={slice.label}
              onHoverIn={() => setActive(slice.label)}
              onHoverOut={() => setActive(null)}
              onPressIn={() => setActive(slice.label)}
              onPressOut={() => setActive(null)}
              style={[styles.legendItem, active === slice.label && { backgroundColor: theme.colors.surfaceAlt }, { opacity: active && active !== slice.label ? 0.45 : 1 }]}
            >
              <View style={[styles.dot, { backgroundColor: slice.color }]} />
              <Text style={[styles.legendText, { color: active === slice.label ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
                {slice.label} · {slice.value}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerValue: { fontSize: 22, fontWeight: '800' },
  centerLabel: { fontSize: 11, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
});
