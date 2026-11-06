import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/common/Button';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { FadeInView } from '@/components/motion/FadeInView';
import { useThemedStyles, useTheme } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Standard layout for every create/edit form:
 * gradient header → progress bar → animated sections → sticky
 * action bar that stays above the keyboard.
 */
export function FormScreen({
  title,
  subtitle,
  icon,
  onBack,
  children,
  submitLabel,
  onSubmit,
  submitting,
  submitDisabled,
  secondaryLabel = 'Cancel',
  onSecondary,
  error,
  completion,
  footerNote,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  onBack?: () => void;
  children: React.ReactNode;
  submitLabel: string;
  onSubmit: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Form-level error (e.g. from the server). */
  error?: string | null;
  /** 0–1: share of required fields completed. */
  completion?: number;
  footerNote?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <HeroHeader title={title} subtitle={subtitle} icon={icon} onBack={onBack} compact />

      {completion !== undefined ? <ProgressBar value={completion} /> : null}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <FadeInView>
              <View style={styles.errorBanner} accessibilityLiveRegion="assertive" accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </FadeInView>
          ) : null}

          {React.Children.toArray(children).map((child, index) => (
            <FadeInView key={index} index={index}>
              {child}
            </FadeInView>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {footerNote ? <Text style={styles.footerNote}>{footerNote}</Text> : null}
          <View style={styles.actions}>
            {onSecondary ? (
              <Button
                label={secondaryLabel}
                variant="secondary"
                onPress={onSecondary}
                disabled={submitting}
                style={styles.secondary}
              />
            ) : null}
            <Button
              label={submitLabel}
              onPress={onSubmit}
              loading={submitting}
              disabled={submitDisabled}
              style={styles.primary}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  const theme = useTheme();
  const width = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    Animated.timing(width, { toValue: value, duration: 300, useNativeDriver: false }).start();
  }, [value, width]);

  return (
    <View
      style={{ height: 3, marginHorizontal: 24, marginTop: 10, borderRadius: 2, backgroundColor: theme.colors.surfaceAlt }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      accessibilityLabel="Form completion"
    >
      <Animated.View
        style={{
          height: 3,
          borderRadius: 2,
          backgroundColor: value >= 1 ? theme.colors.success : theme.colors.primary,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

/** A titled card grouping related fields. */
export function FormSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon ? (
          <View style={styles.sectionIcon}>
            <Ionicons name={icon} size={16} color={theme.colors.primary} />
          </View>
        ) : null}
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    content: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xl * 2,
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
    },
    errorBanner: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    errorText: { flex: 1, color: theme.colors.danger, fontSize: 14, lineHeight: 19 },
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionIcon: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
    },
    sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
    sectionDescription: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
    sectionBody: { marginTop: theme.spacing.md },
    footer: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: 12,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    footerNote: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 8 },
    actions: { flexDirection: 'row', gap: theme.spacing.sm, width: '100%', maxWidth: 720, alignSelf: 'center' },
    secondary: { flex: 1 },
    primary: { flex: 2 },
  });
}
