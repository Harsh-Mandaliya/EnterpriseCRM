import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { restorePublicBranding } from '@/redux/slices/brandingSlice';
import { buildTheme, DEFAULT_THEME_CONFIG } from '@/theme/buildTheme';
import { setActiveTheme } from '@/theme/themeStore';
import type { Theme, ThemeConfig } from '@/theme/types';

/* ============================================================
   CONTEXT
============================================================ */

const ThemeContext = createContext<Theme>(
  buildTheme(DEFAULT_THEME_CONFIG, 'light'),
);

/* ============================================================
   THEME SOURCE
   ------------------------------------------------------------
   Signed in  → branding resolved by the server for this user
                (user preference → role theme → company theme).
   Signed out → the company looked up by company code on the
                login screen, if any.
   Otherwise  → the default classic theme.
============================================================ */

function useThemeConfig(): Partial<ThemeConfig> {
  const isAuthenticated = useAppSelector(
    state => state.auth.status === 'authenticated',
  );
  const resolved = useAppSelector(state => state.branding.data?.resolved);
  const preLogin = useAppSelector(state => state.branding.preLogin);

  return useMemo(() => {
    if (isAuthenticated && resolved) {
      return resolved;
    }
    if (!isAuthenticated && preLogin) {
      return preLogin;
    }
    return DEFAULT_THEME_CONFIG;
  }, [isAuthenticated, resolved, preLogin]);
}

/* ============================================================
   PROVIDER
============================================================ */

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const systemScheme = useColorScheme();
  const config = useThemeConfig();

  const theme = useMemo(
    () => buildTheme(config, systemScheme === 'dark' ? 'dark' : 'light'),
    [config, systemScheme],
  );

  // Update the live token store *during* render so every child
  // in this pass (and every lazily-built style sheet) reads the
  // new values. setActiveTheme is idempotent for an unchanged key.
  setActiveTheme(theme);

  useEffect(() => {
    dispatch(restorePublicBranding());
  }, [dispatch]);

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

/* ============================================================
   HOOKS
============================================================ */

/** The active theme: colors, spacing, radius, brand, isDark. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Builds styles from the active theme and memoizes them until
 * the theme changes:
 *
 *   const styles = useThemedStyles(t => StyleSheet.create({...}));
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  // The factory is expected to be a stable module-level function,
  // so only the theme is a dependency.
  return useMemo(() => factory(theme), [theme]);
}
