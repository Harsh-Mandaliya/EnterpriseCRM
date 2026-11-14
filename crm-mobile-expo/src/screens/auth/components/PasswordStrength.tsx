import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';

/** The server's password policy (auth.validation.ts). */
export const PASSWORD_RULES = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 && p.length <= 128 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
] as const;

export function passwordScore(password: string): number {
  let score = PASSWORD_RULES.filter(rule => rule.test(password)).length;
  if (password.length >= 12) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 5);
}

/** Animated strength meter plus a live checklist of the rules. */
export function PasswordStrength({ password }: { password: string }) {
  const theme = useTheme();
  const score = passwordScore(password);
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, { toValue: score / 5, duration: 260, useNativeDriver: false }).start();
  }, [fill, score]);

  const levels = [
    { label: 'Too weak', color: theme.colors.danger },
    { label: 'Weak', color: theme.colors.danger },
    { label: 'Fair', color: theme.colors.warning },
    { label: 'Good', color: theme.colors.warning },
    { label: 'Strong', color: theme.colors.success },
    { label: 'Very strong', color: theme.colors.success },
  ];
  const level = levels[score];

  if (!password) return null;

  return (
    <View style={styles.wrap} accessibilityLabel={`Password strength: ${level.label}`}>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: level.color,
              width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      <Text style={[styles.level, { color: level.color }]}>{level.label}</Text>
      <View style={styles.rules}>
        {PASSWORD_RULES.map(rule => {
          const ok = rule.test(password);
          return (
            <View key={rule.label} style={styles.rule}>
              <Ionicons
                name={ok ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={ok ? theme.colors.success : theme.colors.textFaint}
              />
              <Text style={{ fontSize: 12, color: ok ? theme.colors.textSecondary : theme.colors.textFaint }}>
                {rule.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: -6, marginBottom: 14 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  level: { fontSize: 12, fontWeight: '700', marginTop: 5 },
  rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
