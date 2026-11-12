import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedNumber, formatCompactCurrency } from '@/components/motion/AnimatedNumber';
import { PressableScale } from '@/components/motion/PressableScale';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Titled card used across the v1.4 screens. */
export function Panel({
  title,
  icon,
  children,
  action,
  subtitle,
  style,
}: {
  title: string;
  icon: IconName;
  children: React.ReactNode;
  action?: { label: string; onPress: () => void; icon?: IconName };
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, style]}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name={icon} size={16} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action ? (
          <PressableScale onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} hitSlop={8} style={styles.actionBtn}>
            {action.icon ? <Ionicons name={action.icon} size={14} color={theme.colors.primary} /> : null}
            <Text style={styles.action}>{action.label}</Text>
          </PressableScale>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Small animated number tile. */
export function Kpi({
  label,
  value,
  icon,
  color,
  money,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  icon: IconName;
  color: string;
  money?: boolean;
  suffix?: string;
  hint?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.kpi} accessible accessibilityLabel={`${label}: ${money ? formatCompactCurrency(value) : value}${suffix ?? ''}`}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <AnimatedNumber
        value={value}
        format={v => (money ? formatCompactCurrency(v) : `${Math.round(v)}${suffix ?? ''}`)}
        style={styles.kpiValue}
      />
      <Text style={styles.kpiLabel}>{label}</Text>
      {hint ? <Text style={[styles.kpiHint, { color }]}>{hint}</Text> : null}
    </View>
  );
}

export function KpiRow({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.kpiRow}>{children}</View>;
}

/** Label / value line for detail screens. */
export function InfoRow({ icon, label, value, onPress }: { icon: IconName; label: string; value: string | null | undefined; onPress?: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const body = (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.colors.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, onPress ? { color: theme.colors.primary } : null]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
  return onPress ? (
    <PressableScale onPress={onPress} accessibilityRole="link">
      {body}
    </PressableScale>
  ) : (
    body
  );
}

/** Horizontal progress bar with label and value. */
export function MeterRow({ label, value, max, color, display }: { label: string; value: number; max: number; color: string; display: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={styles.meterHead}>
        <Text style={styles.meterLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.meterValue}>{display}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** Primary/outline action button with an icon and busy state. */
export function ActionButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  busy,
  disabled,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  busy?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bg = variant === 'primary' ? theme.colors.primary : variant === 'danger' ? theme.colors.dangerSoft : theme.colors.surface;
  const fg = variant === 'primary' ? theme.colors.onPrimary : variant === 'danger' ? theme.colors.danger : theme.colors.primary;
  // PressableScale styles its inner view, so the outer wrapper does the growing.
  return (
    <View style={styles.btnWrap}>
    <PressableScale
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.btn, { backgroundColor: bg, borderColor: variant === 'outline' ? theme.colors.primary : bg, opacity: disabled ? 0.5 : 1 }]}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : <Ionicons name={icon} size={17} color={fg} />}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </PressableScale>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      marginBottom: 14,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    icon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
    title: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
    subtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 1 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
    action: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
    kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    kpi: {
      flexGrow: 1,
      flexBasis: '45%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    kpiIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    kpiValue: { color: theme.colors.text, fontSize: 21, fontWeight: '800' },
    kpiLabel: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    kpiHint: { fontSize: 11, fontWeight: '700', marginTop: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    infoLabel: { color: theme.colors.textMuted, fontSize: 13, width: 92 },
    infoValue: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '600' },
    meterHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, gap: 8 },
    meterLabel: { flex: 1, color: theme.colors.text, fontWeight: '700', fontSize: 13 },
    meterValue: { color: theme.colors.text, fontWeight: '800', fontSize: 13 },
    track: { height: 8, borderRadius: 4, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4 },
    btnWrap: { flexGrow: 1, flexBasis: 150, marginBottom: 4 },
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.md, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 14, width: '100%' },
    btnText: { fontSize: 14, fontWeight: '800' },
  });
}
