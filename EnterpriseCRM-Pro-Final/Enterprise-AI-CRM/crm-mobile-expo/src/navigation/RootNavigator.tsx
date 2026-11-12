import React, { useEffect, useMemo, useRef } from 'react';

import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type LinkingOptions,
  type NavigationState,
  type Theme as NavigationTheme,
} from '@react-navigation/native';

import {
  useAppDispatch,
  useAppSelector,
} from '@/hooks/useRedux';

import {
  hydrateSession,
  logout,
} from '@/redux/slices/authSlice';

import {
  setOnSessionExpired,
} from '@/api/client';

import {
  AuthNavigator,
  type AuthStackParamList,
} from '@/navigation/AuthNavigator';

import {
  AdminNavigator,
} from '@/navigation/AdminNavigator';

import {
  OwnerNavigator,
} from '@/navigation/OwnerNavigator';

import {
  ManagerNavigator,
} from '@/navigation/ManagerNavigator';

import {
  SalesNavigator,
} from '@/navigation/SalesNavigator';

import {
  EmployeeNavigator,
} from '@/navigation/EmployeeNavigator';

import { useTheme } from '@/theme/ThemeProvider';
import { createThemedStyles } from '@/theme/themeStore';
import { colors } from '@/theme/colors';

import type { Role } from '@/types';


/* ============================================================
   ROLE → NAVIGATOR
============================================================ */

const ROLE_NAVIGATORS: Record<Role, React.ComponentType> = {
  OWNER: OwnerNavigator,
  ADMIN: AdminNavigator,
  MANAGER: ManagerNavigator,
  SALES: SalesNavigator,
  EMPLOYEE: EmployeeNavigator,
};


/* ============================================================
   DEEP LINKS (signed out only)
   The password-reset e-mail links to
   crmmobile://reset-password?token=... (PASSWORD_RESET_URL on
   the backend). On web the same path works on the app origin.
============================================================ */

const AUTH_LINKING: LinkingOptions<AuthStackParamList> = {
  prefixes: ['crmmobile://'],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
    },
  },
};


/* ============================================================
   ROOT NAVIGATOR
============================================================ */

export function RootNavigator() {

  const dispatch = useAppDispatch();

  const theme = useTheme();


  /* ==========================================================
     AUTH STATE
  ========================================================== */

  const authStatus = useAppSelector(
    state => state.auth.status,
  );

  const user = useAppSelector(
    state => state.auth.user,
  );


  /* ==========================================================
     NAVIGATION STATE ACROSS THEME CHANGES
     ----------------------------------------------------------
     Screens build their styles from the active theme. When the
     theme changes the navigation tree is re-mounted (key) so
     every screen picks up the new tokens, and the saved state
     puts the user back on the screen they were on.
     The saved state is dropped whenever the signed-in
     user/role changes.
  ========================================================== */

  const navigationState = useRef<NavigationState | undefined>(undefined);

  const sessionKey = `${authStatus}:${user?.id ?? '-'}:${user?.role ?? '-'}`;
  const lastSessionKey = useRef(sessionKey);

  if (lastSessionKey.current !== sessionKey) {
    lastSessionKey.current = sessionKey;
    navigationState.current = undefined;
  }

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: theme.isDark,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.danger,
      },
    };
  }, [theme]);


  /* ==========================================================
     RESTORE SESSION
  ========================================================== */

  useEffect(() => {

    dispatch(
      hydrateSession(),
    );

    setOnSessionExpired(() => {

      dispatch(
        logout(),
      );

    });

  }, [dispatch]);


  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    authStatus === 'idle' ||
    authStatus === 'loading' ||
    (authStatus === 'authenticated' && !user)
  ) {

    return (
      <View
        style={
          styles.loadingContainer
        }
        accessibilityRole="progressbar"
        accessibilityLabel="Loading"
      >

        <ActivityIndicator
          size="large"
          color={
            colors.primary
          }
        />

      </View>
    );
  }


  /* ==========================================================
     ROLE BASED NAVIGATION
     Unknown roles fall back to the sign-in flow.
  ========================================================== */

  const Navigator =
    authStatus === 'authenticated' && user
      ? ROLE_NAVIGATORS[user.role] ?? AuthNavigator
      : AuthNavigator;

  return (
    <NavigationContainer
      key={`${theme.key}:${sessionKey}`}
      theme={navigationTheme}
      linking={Navigator === AuthNavigator ? AUTH_LINKING : undefined}
      initialState={navigationState.current}
      onStateChange={state => {
        navigationState.current = state;
      }}
    >

      <Navigator />

    </NavigationContainer>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles = createThemedStyles(() => StyleSheet.create({

  loadingContainer: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor:
      colors.background,
  },

}));
