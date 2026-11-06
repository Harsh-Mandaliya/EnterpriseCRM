import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme/types';

export function makeThemeSettingsStyles(theme: Theme) {
  const { colors, spacing, radius } = theme;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xl * 2,
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    sectionSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: spacing.md,
    },
    label: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    previewToggle: {
      marginBottom: spacing.sm,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      marginTop: spacing.sm,
    },
    switchText: {
      flex: 1,
      paddingRight: spacing.md,
    },
    switchTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    switchHint: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    roleRow: {
      marginBottom: spacing.sm,
    },
    roleName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    note: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: colors.infoSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    noteText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    lockedNote: {
      color: colors.textMuted,
      fontSize: 13,
      fontStyle: 'italic',
      marginTop: spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    action: {
      flex: 1,
    },
    error: {
      color: colors.danger,
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      fontSize: 13,
    },
    success: {
      color: colors.success,
      backgroundColor: colors.successSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
