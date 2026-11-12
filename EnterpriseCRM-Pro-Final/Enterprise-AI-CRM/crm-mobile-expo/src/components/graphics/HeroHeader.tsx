import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { motion, useReducedMotion } from '@/components/motion/motion';
import { mix } from '@/theme/colorUtils';
import { useTheme } from '@/theme/ThemeProvider';
import { useSvgId } from '@/hooks/useSvgId';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Brand-coloured gradient header with softly floating decorative
 * circles. Used at the top of forms and analytics screens.
 */
export function HeroHeader({
  title,
  subtitle,
  icon,
  onBack,
  right,
  compact,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  onBack?: () => void;
  right?: React.ReactNode;
  compact?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const float = useRef(new Animated.Value(0)).current;
  const gradientId = useSvgId('hero');

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 4200, easing: motion.easing.inOut, useNativeDriver: motion.useNativeDriver }),
        Animated.timing(float, { toValue: 0, duration: 4200, easing: motion.easing.inOut, useNativeDriver: motion.useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, reduced]);

  const start = theme.colors.primary;
  const end = mix(theme.colors.primary, theme.colors.accent, 0.55);
  const onColor = theme.colors.onPrimary;

  return (
    <View
      style={[styles.wrap, { paddingTop: insets.top + 10, paddingBottom: compact ? 18 : 28 }]}
      accessibilityRole="header"
    >
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={start} />
            <Stop offset="1" stopColor={end} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }) },
              { translateX: float.interpolate({ inputRange: [0, 1], outputRange: [4, -4] }) },
            ],
          },
        ]}
      >
        <Svg width="100%" height="100%">
          <Circle cx="88%" cy="18%" r="70" fill="#FFFFFF" opacity={0.09} />
          <Circle cx="70%" cy="105%" r="54" fill="#FFFFFF" opacity={0.07} />
          <Circle cx="6%" cy="10%" r="30" fill="#FFFFFF" opacity={0.06} />
        </Svg>
      </Animated.View>

      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
          >
            <Ionicons name="arrow-back" size={20} color={onColor} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        {right}
      </View>

      <View style={styles.titleRow}>
        {icon ? (
          <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name={icon} size={22} color={onColor} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: onColor }]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: onColor }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  badge: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, marginTop: 3, opacity: 0.88, lineHeight: 19 },
});
