import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Accessible single-choice control (radio group semantics).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.selected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.md,
      padding: 3,
    },
    segment: {
      flex: 1,
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md - 2,
      paddingHorizontal: 6,
    },
    selected: {
      backgroundColor: theme.colors.surface,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    label: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    labelSelected: {
      color: theme.colors.primary,
    },
  });
}
