import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompanyBrand } from '@/components/common/CompanyBrand';
import { motion, useReducedMotion } from '@/components/motion/motion';
import { mix } from '@/theme/colorUtils';
import { useTheme } from '@/theme/ThemeProvider';
import { useSvgId } from '@/hooks/useSvgId';

/**
 * Shared shell for sign-in / sign-up: animated brand gradient with
 * drifting shapes, company logo, and a card that slides up.
 * Wide screens (tablet/web) show the gradient as a side panel.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const wide = width >= 1024;

  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const gradientId = useSvgId('auth');

  useEffect(() => {
    if (reduced) return;
    Animated.timing(enter, {
      toValue: 1,
      duration: motion.duration.slow + 120,
      easing: motion.easing.out,
      useNativeDriver: motion.useNativeDriver,
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 5000, easing: motion.easing.inOut, useNativeDriver: motion.useNativeDriver }),
        Animated.timing(drift, { toValue: 0, duration: 5000, easing: motion.easing.inOut, useNativeDriver: motion.useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, enter, reduced]);

  const gradientEnd = mix(theme.colors.primary, theme.colors.accent, 0.6);

  const backdrop = (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.colors.primary} />
            <Stop offset="1" stopColor={gradientEnd} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
      </Svg>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] }) },
              { rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) },
            ],
          },
        ]}
      >
        <Svg width="100%" height="100%">
          <Circle cx="85%" cy="12%" r="90" fill="#FFFFFF" opacity={0.1} />
          <Circle cx="10%" cy="30%" r="46" fill="#FFFFFF" opacity={0.08} />
          <Circle cx="60%" cy="42%" r="22" fill="#FFFFFF" opacity={0.12} />
        </Svg>
      </Animated.View>
    </View>
  );

  const card = (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg + 8,
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
      {children}
    </Animated.View>
  );

  if (wide) {
    return (
      <View style={[styles.flex, styles.wideRow, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.widePanel]}>
          {backdrop}
          <View style={styles.widePanelContent}>
            <View style={styles.brandPill}>
              <CompanyBrand size={44} />
            </View>
            <Text style={[styles.wideHeadline, { color: theme.colors.onPrimary }]}>
              Every lead, deal and invoice — in one place.
            </Text>
            <Text style={[styles.wideCopy, { color: theme.colors.onPrimary }]}>
              Pipeline, tasks, billing and analytics for your whole team, with access that fits each role.
            </Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1, maxWidth: 560 }} contentContainerStyle={styles.wideForm} keyboardShouldPersistTaps="handled">
          {card}
          {footer}
        </ScrollView>
      </View>
    );
  }

  // The hero lives inside the scroll content so the card can overlap
  // it without being clipped by the ScrollView's bounds.
  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
          {backdrop}
          <View style={styles.brandPill}>
            <CompanyBrand size={40} />
          </View>
        </View>
        <View style={styles.scroll}>
          {card}
          {footer}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { height: 230, paddingHorizontal: 24, overflow: 'hidden' },
  brandPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  scroll: { paddingHorizontal: 18, marginTop: -110 },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 15, marginTop: 6, marginBottom: 20, lineHeight: 21 },
  wideRow: { flexDirection: 'row' },
  widePanel: { flex: 1.2, overflow: 'hidden' },
  widePanelContent: { flex: 1, justifyContent: 'center', padding: 56, gap: 20 },
  wideHeadline: { fontSize: 32, fontWeight: '800', lineHeight: 40, maxWidth: 520 },
  wideCopy: { fontSize: 17, lineHeight: 25, opacity: 0.9, maxWidth: 460 },
  wideForm: { flexGrow: 1, justifyContent: 'center', padding: 40 },
});
