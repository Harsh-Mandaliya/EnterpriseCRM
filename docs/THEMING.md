# Theming and company branding

## What users can change

Theme resolution happens **on the server** (`crm-backend-mongo/src/modules/company/company.service.ts → resolveTheme`) and is returned with `/auth/me` and `/company/branding`:

1. **Personal theme** — the user's own preset, only if the company has *Let people choose their own theme* on.
2. **Role theme** — the preset the company assigned to the user's role (e.g. Sales → Emerald).
3. **Company theme** — the company preset, plus optional brand primary/accent colours.

Colour mode (light / dark / system) is always personal when set, otherwise the company default. Company brand colours only apply to the company preset, so a role or personal preset looks as designed.

Presets (ids shared by backend and app): `classic` (original blue — identical to the pre-theming look), `emerald`, `sunset`, `royal`, `graphite`. Each has a light and a dark palette; every palette is tested for ≥7:1 body-text contrast and ≥3:1 button-text contrast. Custom brand colours are automatically darkened/lightened until they reach 3:1 against surfaces.

Corner style (`sharp`/`rounded`/`pill`) and density (`compact`/`comfortable`) change the radius and spacing tokens.

## Before login

Each company has a unique **company code** (`slug`, generated from the name at registration; the Owner can change it). On the sign-in screen, "Have a company code?" calls the public `GET /company/public/:code`, which returns only presentation fields (name, logo, preset, colours). The look is remembered on the device until "Not your company?" is tapped.

## What runtime branding cannot change

The app icon, splash screen and the name under the icon on the phone's home screen come from the installed build (`app.json`). Giving a company its own icon/name needs a separate build (e.g. an EAS build profile per brand). The in-app name, logo and colours change at runtime without a new build.

## How it works in the app

```
Redux (auth.user.branding / branding.data / branding.preLogin)
        │
        ▼
ThemeProvider  ── buildTheme(config, systemScheme) ──► Theme { colors, spacing, radius, brand, key }
        │                 (validates every field; bad data → safe defaults)
        ├─► React context  → useTheme(), useThemedStyles()   (preferred for new code)
        └─► themeStore      → live `colors`, `spacing`, `radius` exports
                               createThemedStyles(() => StyleSheet.create({...}))
RootNavigator: <NavigationContainer key={theme.key} initialState={saved}>
```

Most existing screens were written with module-level `StyleSheet.create({ ... colors.primary ... })`. Rather than rewriting ~50,000 lines into hooks, those sheets are wrapped in `createThemedStyles`, which builds them lazily and rebuilds when the theme key changes. When the theme changes, the navigation tree is re-mounted with its saved navigation state, so the user stays on the same screen. Unsaved form input on the visible screen is reset by that re-mount — theme changes only happen from the settings screen, the login company lookup, or sign-in.

The one-off codemod that introduced this replaced only hex literals that exactly matched the original palette (e.g. `backgroundColor: '#FFFFFF'` → `colors.surface`, `color: '#0F172A'` → `colors.text`), so the Classic light theme renders exactly as before. Other hard-coded colours (status-badge maps, chart palettes) remain static; they are legible in both modes but don't follow brand colours.

### Writing new screens

```tsx
import { useTheme, useThemedStyles } from '@/theme';
import type { Theme } from '@/theme';

export function MyScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.box}><Text style={{ color: colors.textMuted }}>Hi</Text></View>;
}

function makeStyles(t: Theme) {
  return StyleSheet.create({ box: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: t.spacing.md } });
}
```

Don't copy `colors.x` into a module-level constant — it would be frozen at import time.

## Files

| File | Purpose |
|---|---|
| `src/theme/types.ts` | Theme, palette and config types |
| `src/theme/presets.ts` | The five presets (light + dark) |
| `src/theme/buildTheme.ts` | Config validation and theme construction |
| `src/theme/colorUtils.ts` | Mix, contrast, readable-text helpers |
| `src/theme/themeStore.ts` | Active theme, live views, `createThemedStyles` |
| `src/theme/ThemeProvider.tsx` | Provider, `useTheme`, `useThemedStyles` |
| `src/redux/slices/brandingSlice.ts` | Branding state and save thunks |
| `src/api/company.api.ts` | Branding API client |
| `src/screens/settings/*` | Theme & Branding screen, form hook, preview, pickers |
| `src/components/auth/CompanyCodeLookup.tsx` | Pre-login company look |
| `src/components/common/CompanyBrand.tsx` | Logo + name (initials fallback) |
