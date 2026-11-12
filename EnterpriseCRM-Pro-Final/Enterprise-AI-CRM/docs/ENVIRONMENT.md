# Environment variables

Templates: `crm-backend-mongo/.env.example` and `crm-mobile-expo/.env.example`. Copy each to `.env`. Real `.env` files are git-ignored and are **not** included in the release ZIP.

## Backend (`crm-backend-mongo/.env`)

| Variable | Required | Default | Description |
|---|:-:|---|---|
| `NODE_ENV` | | `development` | `development`, `production` or `test`. Production enables strict checks and JSON logs |
| `PORT` | | `4000` | HTTP port |
| `MONGODB_URI` | ✅ | — | MongoDB connection string incl. database name |
| `JWT_ACCESS_SECRET` | ✅ | — | ≥32 random chars. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | ✅ | — | ≥32 random chars, **different** from the access secret |
| `JWT_ACCESS_EXPIRES_IN` | | `15m` | Access-token lifetime (`jsonwebtoken` syntax) |
| `JWT_REFRESH_EXPIRES_IN` | | `30d` | Refresh JWT lifetime |
| `JWT_REFRESH_EXPIRES_DAYS` | | `30` | Stored refresh-session lifetime in days (keep equal to the above) |
| `CORS_ORIGIN` | prod ✅ | `*` (dev only) | Comma-separated browser origins. Must be explicit in production |
| `TRUST_PROXY` | | `0` | Proxy hops in front of the API, so rate limits see the real client IP |
| `GOOGLE_CLIENT_ID` | | — | Enables `/auth/google`. Empty → 503 |
| `PASSWORD_RESET_URL` | | `crmmobile://reset-password` | Base link for reset e-mails (`?token=` is appended) |
| `AUTH_RATE_LIMIT_WINDOW_MS` | | `900000` | Auth rate-limit window |
| `AUTH_RATE_LIMIT_MAX` | | `20` | Login attempts per IP+e-mail per window (all auth routes per IP: 5×) |
| `API_RATE_LIMIT_WINDOW_MS` | | `60000` | API rate-limit window |
| `API_RATE_LIMIT_MAX` | | `300` | Requests per IP per window |
| `TEST_MONGODB_URI` | tests | `mongodb://127.0.0.1:27017` | Server for throw-away test databases. Never production |

## Mobile (`crm-mobile-expo/.env`)

`EXPO_PUBLIC_*` values are compiled into the app bundle and are readable by anyone with the app — never put secrets here.

| Variable | Required | Description |
|---|:-:|---|
| `EXPO_PUBLIC_API_URL` | ✅ | API base incl. `/api/v1`. Physical phone: `http://<LAN-IP>:4000/api/v1` · Android emulator: `http://10.0.2.2:4000/api/v1` · iOS simulator / web: `http://localhost:4000/api/v1` · production: `https://…` |

If unset, the app falls back to `10.0.2.2` on Android and `localhost` elsewhere and logs a warning in development. Restart `npx expo start` after editing `.env`.

Find your LAN IP: `ipconfig` (Windows), `ipconfig getifaddr en0` (macOS), `ip addr` (Linux).
