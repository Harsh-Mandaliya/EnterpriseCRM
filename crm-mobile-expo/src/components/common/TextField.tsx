import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import type { Theme } from '@/theme/types';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({
  label,
  error,
  hint,
  style,
  ...inputProps
}: TextFieldProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput underlineColorAndroid="transparent"
        style={[styles.input, Boolean(error) && styles.inputError, style]}
        placeholderTextColor={theme.colors.textFaint}
        autoCapitalize="none"
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        {...inputProps}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    label: {
      ...typography.caption,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xs,
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      ...typography.body,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
    },
    inputError: {
      borderColor: theme.colors.danger,
    },
    error: {
      ...typography.small,
      color: theme.colors.danger,
      marginTop: theme.spacing.xs,
    },
    hint: {
      ...typography.small,
      color: theme.colors.textFaint,
      marginTop: theme.spacing.xs,
    },
  });
}
