import { describe, expect, it, jest } from '@jest/globals';

import { buildTheme, DEFAULT_THEME_CONFIG } from '@/theme/buildTheme';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/typography';
import {
  createThemedStyles,
  getActiveTheme,
  setActiveTheme,
  subscribeToTheme,
} from '@/theme/themeStore';

describe('live theme tokens', () => {
  it('`colors` and `radius` always reflect the active theme', () => {
    setActiveTheme(buildTheme(DEFAULT_THEME_CONFIG, 'light'));
    expect(colors.primary).toBe('#2563EB');
    expect(radius.md).toBe(10);

    setActiveTheme(buildTheme({ ...DEFAULT_THEME_CONFIG, preset: 'emerald', cornerStyle: 'sharp' }, 'light'));
    expect(colors.primary).toBe('#059669');
    expect(radius.md).toBe(4);
    expect({ ...colors }.primary).toBe('#059669');
  });

  it('createThemedStyles rebuilds only when the theme key changes', () => {
    setActiveTheme(buildTheme(DEFAULT_THEME_CONFIG, 'light'));
    const factory = jest.fn(() => ({ box: { backgroundColor: colors.primary } }));
    const styles = createThemedStyles(factory);

    expect(factory).not.toHaveBeenCalled();
    expect(styles.box.backgroundColor).toBe('#2563EB');
    expect(styles.box.backgroundColor).toBe('#2563EB');
    expect(factory).toHaveBeenCalledTimes(1);

    setActiveTheme(buildTheme({ ...DEFAULT_THEME_CONFIG, colorMode: 'dark' }, 'light'));
    expect(styles.box.backgroundColor).toBe(getActiveTheme().colors.primary);
    expect(styles.box.backgroundColor).not.toBe('#2563EB');
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('notifies subscribers once per actual change', () => {
    setActiveTheme(buildTheme(DEFAULT_THEME_CONFIG, 'light'));
    const listener = jest.fn();
    const unsubscribe = subscribeToTheme(listener);

    setActiveTheme(buildTheme(DEFAULT_THEME_CONFIG, 'light'));
    expect(listener).not.toHaveBeenCalled();

    setActiveTheme(buildTheme({ ...DEFAULT_THEME_CONFIG, preset: 'sunset' }, 'light'));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setActiveTheme(buildTheme({ ...DEFAULT_THEME_CONFIG, preset: 'royal' }, 'light'));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
