# EnterpriseCRM Pro — mobile & web app

Expo SDK 58 · React Native 0.88 · React 19.3 · TypeScript · Redux Toolkit · React Navigation 7.

Runs in **Expo Go** (SDK 58), on Android/iOS simulators, and on the web (`react-native-web`).

```bash
npm ci
cp .env.example .env      # EXPO_PUBLIC_API_URL=http://<LAN-IP>:4000/api/v1
npx expo start            # a / i / w, or scan the QR in Expo Go
```

| Script | |
|---|---|
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Jest (jest-expo) + React Native Testing Library |
| `npx expo-doctor` | Expo project health |
| `npx expo export --platform web` | Production web bundle |

## Structure

```
src/
  api/            axios client (token refresh, error messages) + one file per backend module
  components/     common/ (Button, Card, TextField, SegmentedControl, CompanyBrand, ScreenState, StatusBadge), auth/
  navigation/     RootNavigator (role → navigator), one navigator per role, shared param list (types.ts)
  redux/          store + slices (auth, branding, leads, opportunities, activities, users)
  screens/        feature screens; settings/ = Theme & Branding
  storage/        SecureStore (localStorage on web) for tokens and small preferences
  theme/          presets, buildTheme, ThemeProvider/useTheme, live tokens — see ../docs/THEMING.md
  types/          shared API types
  utils/          confirmAction (cross-platform confirmation)
```

Theming, role themes and company branding: [../docs/THEMING.md](../docs/THEMING.md). Everything else: [../README.md](../README.md).
