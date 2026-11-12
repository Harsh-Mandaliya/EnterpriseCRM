# EnterpriseCRM Pro

A mobile-first, multi-company CRM: **React Native (Expo SDK 58)** app for Android, iOS and web, backed by a **Node.js / Express / MongoDB** REST API.

Every company gets its own look — logo, display name, five theme presets, custom brand colours, light/dark mode, and a different theme per role — and every user can pick their own dark mode or theme when the company allows it.

```
crm-backend-mongo/   Node.js 20+ · Express 4 · TypeScript · Mongoose 8 · Zod
crm-mobile-expo/     Expo SDK 58 · React Native 0.88 · React 19.3 · Redux Toolkit · React Navigation 7
docs/                Installation, environment, architecture, API, permissions, security, testing, deployment
FINAL_AUDIT_REPORT.md   What was found, fixed, tested — and what is still open
```

## Quick start

Requirements: Node.js 20+ (tested on Node 24), npm, MongoDB 6+ (local `mongod` or Atlas), and Expo Go for SDK 58 (current Play Store / App Store version) or a simulator.

```bash
# 1. Backend
cd crm-backend-mongo
cp .env.example .env          # then edit: MONGODB_URI and two different JWT secrets
npm ci
npm run migrate               # only when upgrading an existing database
npm run dev                   # http://localhost:4000/api/v1/health
```

```bash
# 2. Mobile / web
cd crm-mobile-expo
cp .env.example .env          # EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:4000/api/v1
npm ci
npx expo start                # scan the QR with Expo Go, or press w for web
```

A physical phone cannot reach `localhost` on your computer — use your computer's LAN IP (see [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)).

## Checks

```bash
cd crm-backend-mongo && npm run typecheck && npm test && npm run build
cd crm-mobile-expo   && npm run typecheck && npm run lint && npm test && npx expo-doctor
```

Backend tests need a MongoDB server (`TEST_MONGODB_URI`, default `mongodb://127.0.0.1:27017`); each test file uses its own throw-away database. Results of the last run are in [docs/TESTING.md](docs/TESTING.md).

## Themes and branding

Profile → **Theme & branding**:

| Who | Can change |
|---|---|
| Everyone | Colour mode (System / Light / Dark / Company default) and, if allowed, a personal theme |
| Owner, Admin | Company display name, logo URL, theme preset, brand colours, corners, density, default colour mode, a theme per role, whether people may pick their own theme |
| Owner | Company code (used on the sign-in screen to show the company's look before login), currency, time zone |

Details: [docs/THEMING.md](docs/THEMING.md).

## Documentation

| | |
|---|---|
| [INSTALLATION](docs/INSTALLATION.md) | Prerequisites and setup |
| [ENVIRONMENT](docs/ENVIRONMENT.md) | Every environment variable |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Backend, mobile, database, theming |
| [API](docs/API.md) | Endpoints, auth, permissions |
| [ROLE_PERMISSIONS](docs/ROLE_PERMISSIONS.md) | Role × resource matrix |
| [SECURITY](docs/SECURITY.md) | Controls and remaining risks |
| [TESTING](docs/TESTING.md) | Commands and actual results |
| [DEPLOYMENT](docs/DEPLOYMENT.md) | Production deployment, backup, rollback |
| [THEMING](docs/THEMING.md) | Theme engine and branding |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) | Motion, charts and form kit |
| [CHANGELOG](docs/CHANGELOG.md) | Changes in this release |
| [KNOWN_LIMITATIONS](docs/KNOWN_LIMITATIONS.md) | What is not done yet |

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Cannot reach the server" / registration fails on a phone | `EXPO_PUBLIC_API_URL` must use your computer's LAN IP, phone and computer on the same Wi-Fi; restart `npx expo start` after editing `.env`. Try `npx expo start --tunnel`. |
| Backend exits with `Missing required environment variable` | Copy `.env.example` to `.env` and fill it in. |
| Backend exits with `CORS_ORIGIN must list explicit origins in production` | Set `CORS_ORIGIN` to your web origins when `NODE_ENV=production`. |
| Everyone was signed out after upgrading | Expected once: refresh tokens are now stored hashed and `npm run migrate` removes the old plaintext ones. |
| `/auth/google` returns 503 | `GOOGLE_CLIENT_ID` is not set on the backend. |
| `429 Too many requests` on login | Brute-force protection; wait for the window (`AUTH_RATE_LIMIT_WINDOW_MS`) to pass. |
| "Project is incompatible with this version of Expo Go" | The app targets SDK 58 (v1.3+). Use the latest Expo Go; if you opened an older copy of the project (SDK 57), use this release instead. Run `npx expo install --check`. |
| Backend tests fail to connect | Start `mongod` locally or set `TEST_MONGODB_URI`. |
