import { liveView } from '@/theme/themeStore';
import type { ThemeRadius, ThemeSpacing } from '@/theme/types';

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  small: { fontSize: 11, fontWeight: '500' as const },
};

/** Spacing of the active theme (follows the company density). */
export const spacing: ThemeSpacing = liveView(theme => theme.spacing);

/** Corner radii of the active theme (follows the company corner style). */
export const radius: ThemeRadius = liveView(theme => theme.radius);
