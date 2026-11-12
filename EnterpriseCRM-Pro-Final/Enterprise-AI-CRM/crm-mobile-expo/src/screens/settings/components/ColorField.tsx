import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TextField } from '@/components/common/TextField';
import { useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';

const SUGGESTED = ['#2563EB', '#059669', '#EA580C', '#4F46E5', '#DB2777', '#0D9488', '#334155', '#CA8A04'];

export const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Hex colour input with quick swatches. Empty = use the preset colour.
 */
export function ColorField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const valid = HEX_PATTERN.test(value);

  return (
    <View>
      <View style={styles.inputRow}>
        <View style={{ flex: 1 }}>
          <TextField
            label={label}
            value={value}
            onChangeText={text => onChange(text.trim().toUpperCase())}
            placeholder="Preset colour"
            autoCapitalize="characters"
            maxLength={7}
            error={error}
            hint="6-digit hex, e.g. #2563EB. Leave empty to use the preset."
          />
        </View>
        <View
          style={[styles.preview, valid ? { backgroundColor: value } : styles.previewEmpty]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>

      <View style={styles.swatches}>
        {SUGGESTED.map(color => (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            style={[styles.swatch, { backgroundColor: color }, value === color && styles.swatchSelected]}
            accessibilityRole="button"
            accessibilityLabel={`Use colour ${color}`}
          />
        ))}
        <Pressable
          onPress={() => onChange('')}
          style={styles.clear}
          accessibilityRole="button"
          accessibilityLabel="Use the preset colour"
        >
          <Text style={styles.clearText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    preview: {
      width: 48,
      height: 48,
      marginTop: 18,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    previewEmpty: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    swatches: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      marginTop: -4,
      marginBottom: theme.spacing.md,
    },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    swatchSelected: {
      borderWidth: 3,
      borderColor: theme.colors.text,
    },
    clear: {
      paddingHorizontal: 10,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceAlt,
    },
    clearText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
  });
}
