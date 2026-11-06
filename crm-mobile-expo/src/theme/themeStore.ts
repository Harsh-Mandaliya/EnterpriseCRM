import { buildTheme, DEFAULT_THEME_CONFIG } from '@/theme/buildTheme';
import type { Theme } from '@/theme/types';

/* ============================================================
   ACTIVE THEME STORE
   ------------------------------------------------------------
   Most screens were written with module-level
   `StyleSheet.create({ ... colors.primary ... })`, which is
   evaluated once at import time. To let those screens follow a
   runtime theme without rewriting every file into hooks:

   1. ThemeProvider writes the active theme here.
   2. `colors`, `spacing` and `radius` (theme/colors.ts,
      theme/typography.ts) are live views of this store.
   3. createThemedStyles() builds each style sheet lazily and
      rebuilds it when the theme key changes.
   4. RootNavigator re-mounts the navigation tree (keeping the
      navigation state) when the theme key changes, so every
      screen re-renders with the new values.

   New code should prefer the useTheme() hook.
============================================================ */

let activeTheme: Theme = buildTheme(DEFAULT_THEME_CONFIG, 'light');

const listeners = new Set<(theme: Theme) => void>();

export function getActiveTheme(): Theme {
  return activeTheme;
}

export function setActiveTheme(theme: Theme): void {
  if (theme.key === activeTheme.key && theme.brand.displayName === activeTheme.brand.displayName && theme.brand.logoUrl === activeTheme.brand.logoUrl) {
    return;
  }
  activeTheme = theme;
  listeners.forEach(listener => listener(theme));
}

export function subscribeToTheme(listener: (theme: Theme) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * A read-only object whose properties always reflect the active
 * theme. `select` picks the part of the theme to expose.
 */
export function liveView<T extends object>(select: (theme: Theme) => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      return Reflect.get(select(activeTheme), prop);
    },
    has(_target, prop) {
      return Reflect.has(select(activeTheme), prop);
    },
    ownKeys() {
      return Reflect.ownKeys(select(activeTheme));
    },
    getOwnPropertyDescriptor(_target, prop) {
      const descriptor = Reflect.getOwnPropertyDescriptor(select(activeTheme), prop);
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
  });
}

/**
 * Lazily builds a value from the active theme and rebuilds it
 * only when the theme key changes. Used for module-level style
 * sheets and colour maps:
 *
 *   const styles = createThemedStyles(() => StyleSheet.create({...}));
 */
export function createThemedStyles<T extends object>(factory: () => T): T {
  let cachedKey: string | null = null;
  let cached: T | null = null;

  const current = (): T => {
    if (cached === null || cachedKey !== activeTheme.key) {
      cached = factory();
      cachedKey = activeTheme.key;
    }
    return cached;
  };

  return new Proxy({} as T, {
    get(_target, prop) {
      return Reflect.get(current(), prop);
    },
    has(_target, prop) {
      return Reflect.has(current(), prop);
    },
    ownKeys() {
      return Reflect.ownKeys(current());
    },
    getOwnPropertyDescriptor(_target, prop) {
      const descriptor = Reflect.getOwnPropertyDescriptor(current(), prop);
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
  });
}

/** Alias for non-style values (colour maps, chart palettes). */
export const createThemedValue = createThemedStyles;
