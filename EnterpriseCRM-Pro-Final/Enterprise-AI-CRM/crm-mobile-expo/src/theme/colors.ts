import { liveView } from '@/theme/themeStore';
import type { ThemeColors } from '@/theme/types';

/**
 * Colour tokens of the ACTIVE theme.
 *
 * This keeps the original `import { colors } from '@/theme/colors'`
 * API working everywhere, but values now follow the company /
 * role / user theme at runtime (see theme/themeStore.ts).
 *
 * Read tokens at render time or inside createThemedStyles();
 * values copied into module-level constants are frozen at
 * import time.
 */
export const colors: ThemeColors = liveView(theme => theme.colors);
