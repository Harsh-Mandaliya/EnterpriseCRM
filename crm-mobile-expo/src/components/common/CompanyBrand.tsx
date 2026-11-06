import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';

/**
 * Company logo + display name from the active theme. Falls back to
 * an initials badge when there is no logo or it fails to load.
 */
export function CompanyBrand({
  size = 40,
  showName = true,
  subtitle,
  logoUrl,
  displayName,
}: {
  size?: number;
  showName?: boolean;
  subtitle?: string;
  /** Override (e.g. live preview while editing). */
  logoUrl?: string | null;
  displayName?: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [failed, setFailed] = useState(false);

  const name = displayName ?? theme.brand.displayName;
  const logo = logoUrl !== undefined ? logoUrl : theme.brand.logoUrl;

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word[0]?.toUpperCase() ?? '')
      .join('') || 'C';

  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel={name}>
      {logo && !failed ? (
        <Image
          source={{ uri: logo }}
          onError={() => setFailed(true)}
          style={[styles.logo, { width: size, height: size, borderRadius: theme.radius.md }]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          style={[
            styles.badge,
            { width: size, height: size, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
        </View>
      )}

      {showName ? (
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logo: {
      backgroundColor: theme.colors.surface,
    },
    badge: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    initials: {
      color: theme.colors.onPrimary,
      fontWeight: '800',
    },
    texts: {
      marginLeft: theme.spacing.sm,
      flexShrink: 1,
    },
    name: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
  });
}
