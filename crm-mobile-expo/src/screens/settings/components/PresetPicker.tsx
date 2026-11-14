import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRESET_LIST } from '@/theme/presets';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme, ThemePresetId } from '@/theme/types';

/**
 * Horizontal list of preset cards with colour swatches.
 * `allowInherit` adds a first card meaning "no override".
 */
export function PresetPicker({
  value,
  onChange,
  allowInherit,
  inheritLabel = 'Company default',
}: {
  value: ThemePresetId | null;
  onChange: (value: ThemePresetId | null) => void;
  allowInherit?: boolean;
  inheritLabel?: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      accessibilityRole="radiogroup"
    >
      {allowInherit ? (
        <Pressable
          onPress={() => onChange(null)}
          style={[styles.card, value === null && styles.cardSelected]}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === null }}
          accessibilityLabel={inheritLabel}
        >
          <View style={[styles.swatchRow, styles.inheritSwatch]}>
            <Ionicons name="business-outline" size={22} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {inheritLabel}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            Follow the company look
          </Text>
        </Pressable>
      ) : null}

      {PRESET_LIST.map(preset => {
        const selected = preset.id === value;
        const palette = theme.isDark ? preset.dark : preset.light;
        return (
          <Pressable
            key={preset.id}
            onPress={() => onChange(preset.id)}
            style={[styles.card, selected && styles.cardSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${preset.name} theme`}
            accessibilityHint={preset.description}
          >
            <View style={[styles.swatchRow, { backgroundColor: palette.background }]}>
              <View style={[styles.swatch, { backgroundColor: palette.primary }]} />
              <View style={[styles.swatch, { backgroundColor: palette.accent }]} />
              <View style={[styles.swatch, { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }]} />
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {preset.name}
              </Text>
              {selected ? <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} /> : null}
            </View>
            <Text style={styles.description} numberOfLines={2}>
              {preset.description}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      gap: theme.spacing.sm,
      paddingVertical: 2,
    },
    card: {
      width: 140,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
    },
    cardSelected: {
      borderColor: theme.colors.primary,
    },
    swatchRow: {
      height: 44,
      borderRadius: theme.radius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginBottom: theme.spacing.sm,
    },
    inheritSwatch: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    swatch: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    name: {
      color: theme.colors.text,
      fontWeight: '700',
      fontSize: 13,
      flexShrink: 1,
    },
    description: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 2,
      lineHeight: 15,
    },
  });
}
