import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { CompanyBrand } from '@/components/common/CompanyBrand';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import {
  clearPublicBranding,
  loadPublicBranding,
} from '@/redux/slices/brandingSlice';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';

const CODE_PATTERN = /^[a-z0-9-]{3,40}$/;

/**
 * Optional "company code" on the sign-in screen. Loads the
 * company's public branding (name, logo, theme) so the login
 * screen already looks like the user's company. It reveals no
 * private data and is not required to sign in.
 */
export function CompanyCodeLookup() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { preLogin, isLoadingPublic, error } = useAppSelector(state => state.branding);

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);

  const normalized = code.trim().toLowerCase();
  const invalid = touched && !CODE_PATTERN.test(normalized);

  if (preLogin) {
    return (
      <View style={styles.box}>
        <CompanyBrand
          size={36}
          displayName={preLogin.displayName}
          logoUrl={preLogin.logoUrl}
          subtitle={`Company code: ${preLogin.slug}`}
        />
        <Pressable
          onPress={() => dispatch(clearPublicBranding())}
          accessibilityRole="button"
          accessibilityLabel="Use a different company"
          hitSlop={8}
        >
          <Text style={styles.link}>Not your company?</Text>
        </Pressable>
      </View>
    );
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        hitSlop={8}
        style={styles.toggle}
      >
        <Text style={styles.link}>Have a company code? Load your company’s look</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.label}>Company code</Text>
      <View style={styles.row}>
        <TextInput underlineColorAndroid="transparent"
          value={code}
          onChangeText={setCode}
          onBlur={() => setTouched(true)}
          placeholder="e.g. acme-traders"
          placeholderTextColor={theme.colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={40}
          style={[styles.input, invalid && styles.inputError]}
          accessibilityLabel="Company code"
          returnKeyType="go"
          onSubmitEditing={() => {
            setTouched(true);
            if (CODE_PATTERN.test(normalized)) dispatch(loadPublicBranding(normalized));
          }}
        />
        <Button
          label="Load"
          variant="secondary"
          loading={isLoadingPublic}
          disabled={!CODE_PATTERN.test(normalized)}
          onPress={() => dispatch(loadPublicBranding(normalized))}
          style={styles.button}
        />
      </View>
      {invalid ? (
        <Text style={styles.error}>Use 3–40 letters, numbers or dashes.</Text>
      ) : error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : (
        <Text style={styles.hint}>Ask your admin for it. You can sign in without it.</Text>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    toggle: {
      alignSelf: 'center',
      marginBottom: theme.spacing.md,
    },
    box: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    label: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    input: {
      flex: 1,
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      fontSize: 15,
    },
    inputError: {
      borderColor: theme.colors.danger,
    },
    button: {
      paddingHorizontal: theme.spacing.md,
    },
    link: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    hint: {
      color: theme.colors.textFaint,
      fontSize: 12,
    },
    error: {
      color: theme.colors.danger,
      fontSize: 12,
    },
  });
}
