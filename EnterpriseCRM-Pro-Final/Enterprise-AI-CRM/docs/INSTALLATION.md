# Installation

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS or newer | Developed and tested on Node 24.19 |
| npm | 10+ | Lockfiles are npm (`package-lock.json`) |
| MongoDB | 6+ | Local `mongod` (tested with 8.3) or MongoDB Atlas |
| Expo Go | SDK 58 | Or Android Studio emulator / Xcode simulator |
| Git | any | |

## 1. Backend

```bash
cd crm-backend-mongo
npm ci                         # reproducible install from package-lock.json
cp .env.example .env           # Windows: copy .env.example .env
```

Edit `.env`: set `MONGODB_URI` and two **different** JWT secrets (see [ENVIRONMENT.md](ENVIRONMENT.md)).

Upgrading an existing database from the previous version? Back it up, then:

```bash
npm run migrate -- --dry       # shows what will change
npm run migrate                # adds company codes + default branding, removes legacy plaintext refresh tokens, syncs indexes
```

Run:

```bash
npm run dev                    # watch mode
# or
npm run build && npm start     # compiled
```

Check `http://localhost:4000/api/v1/health` and `/api/v1/ready`.

## 2. Mobile / web app

```bash
cd crm-mobile-expo
npm ci
cp .env.example .env           # set EXPO_PUBLIC_API_URL
npx expo start                 # a = Android, i = iOS, w = web; or scan the QR with Expo Go
```

If the phone can't connect on the same Wi-Fi: `npx expo start --tunnel`.

## 3. First use

1. Open the app → **Register your company** (you become the OWNER; a company code is generated from the name).
2. Profile → **Manage team** to add Admin / Manager / Sales / Employee users.
3. Profile → **Theme & branding** to set the logo, theme preset, brand colours and role themes.
4. Share the **company code** so teammates see your branding on the sign-in screen.

## 4. Verify

```bash
cd crm-backend-mongo && npm run typecheck && npm test && npm run build
cd ../crm-mobile-expo && npm run typecheck && npm run lint && npm test && npx expo-doctor
```
