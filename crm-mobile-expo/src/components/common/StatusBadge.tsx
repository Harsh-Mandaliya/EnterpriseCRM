import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { mix } from '@/theme/colorUtils';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';

/**
 * Small pill for statuses (lead stage, invoice status, role...).
 * Colours follow the active theme in light and dark mode.
 */
export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: BadgeTone;
}) {
  const { colors, isDark } = useTheme();

  const fg = {
    neutral: colors.textMuted,
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    accent: colors.accent,
  }[tone];

  const bg = mix(fg.startsWith('#') ? fg : '#64748B', colors.surface, isDark ? 0.8 : 0.88);

  return (
    <View style={[styles.badge, { backgroundColor: bg }]} accessibilityLabel={label}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
