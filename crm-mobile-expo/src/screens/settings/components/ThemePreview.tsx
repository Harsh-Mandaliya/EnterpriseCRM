import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildTheme } from '@/theme/buildTheme';
import type { Theme, ThemeConfig } from '@/theme/types';

/**
 * Self-contained mini dashboard rendered with a *draft* theme, so
 * changes can be previewed before they are saved and applied to
 * the whole app. Uses only the draft theme's tokens.
 */
export function ThemePreview({
  config,
  systemScheme,
  roleLabel,
}: {
  config: ThemeConfig;
  systemScheme: 'light' | 'dark';
  roleLabel: string;
}) {
  const theme = useMemo(() => buildTheme(config, systemScheme), [config, systemScheme]);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { colors } = theme;

  const initials = theme.brand.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={styles.frame}
      accessible
      accessibilityLabel={`Preview of ${theme.presetName} theme, ${theme.isDark ? 'dark' : 'light'} mode`}
    >
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>{initials || 'C'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.company} numberOfLines={1}>
            {theme.brand.displayName}
          </Text>
          <Text style={styles.muted}>{roleLabel} dashboard</Text>
        </View>
        <Ionicons name="notifications-outline" size={20} color={colors.textMuted} />
      </View>

      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.muted}>Pipeline</Text>
          <Text style={styles.statValue}>₹4.2L</Text>
          <Text style={[styles.delta, { color: colors.success }]}>▲ 12%</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.muted}>Open leads</Text>
          <Text style={styles.statValue}>38</Text>
          <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.badgeText, { color: colors.accent }]}>Qualified</Text>
          </View>
        </View>
      </View>

      <View style={styles.button}>
        <Text style={styles.buttonText}>Add lead</Text>
      </View>

      <Text style={styles.caption}>
        {theme.presetName} · {theme.isDark ? 'Dark' : 'Light'} · {config.cornerStyle} · {config.density}
      </Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, radius, spacing } = theme;
  return StyleSheet.create({
    frame: {
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    logo: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: { color: colors.onPrimary, fontWeight: '800' },
    company: { color: colors.text, fontWeight: '800', fontSize: 15 },
    muted: { color: colors.textMuted, fontSize: 12 },
    row: { flexDirection: 'row', gap: spacing.sm },
    stat: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm + 2,
    },
    statValue: { color: colors.text, fontSize: 20, fontWeight: '800', marginVertical: 2 },
    delta: { fontSize: 12, fontWeight: '700' },
    badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    button: {
      marginTop: spacing.md,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: { color: colors.onPrimary, fontWeight: '700' },
    caption: { color: colors.textFaint, fontSize: 11, marginTop: spacing.sm, textAlign: 'center' },
  });
}
