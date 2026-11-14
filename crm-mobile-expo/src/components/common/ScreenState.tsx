import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';

/**
 * Consistent loading / empty / error states for any screen.
 *
 *   <ScreenState kind="error" message={error} onRetry={reload} />
 */
export function ScreenState({
  kind,
  title,
  message,
  onRetry,
  retryLabel = 'Try again',
}: {
  kind: 'loading' | 'empty' | 'error';
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  if (kind === 'loading') {
    return (
      <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={title ?? 'Loading'}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    );
  }

  const isError = kind === 'error';

  return (
    <View style={styles.container} accessibilityLiveRegion={isError ? 'assertive' : 'none'}>
      <View style={[styles.iconWrap, { backgroundColor: isError ? theme.colors.dangerSoft : theme.colors.primaryLight }]}>
        <Ionicons
          name={isError ? 'alert-circle-outline' : 'file-tray-outline'}
          size={28}
          color={isError ? theme.colors.danger : theme.colors.primary}
        />
      </View>
      <Text style={styles.title}>{title ?? (isError ? 'Something went wrong' : 'Nothing here yet')}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? <Button label={retryLabel} onPress={onRetry} variant="secondary" style={styles.retry} /> : null}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
    },
    message: {
      color: theme.colors.textMuted,
      fontSize: 14,
      marginTop: theme.spacing.sm,
      textAlign: 'center',
      lineHeight: 20,
    },
    retry: {
      marginTop: theme.spacing.lg,
      alignSelf: 'stretch',
    },
  });
}
