# Deployment

## Backend

1. **Provision** MongoDB (Atlas or managed), with a dedicated database user limited to the CRM database, TLS on, and network access restricted to the API hosts.
2. **Configure** environment (see [ENVIRONMENT.md](ENVIRONMENT.md)): `NODE_ENV=production`, explicit `CORS_ORIGIN`, fresh 48-byte JWT secrets, `TRUST_PROXY` = number of proxies (e.g. `1` behind a load balancer).
3. **Build & run**
   ```bash
   cd crm-backend-mongo
   npm ci
   npm run build
   npm prune --omit=dev
   NODE_ENV=production node dist/server.js
   ```
   Run under a supervisor (systemd, PM2, container orchestrator). Terminate TLS at the proxy/load balancer.
4. **Health checks**: liveness `GET /api/v1/health`, readiness `GET /api/v1/ready` (503 until MongoDB is connected).
5. **Migrate** once per release that needs it, **after a backup**: `npm run migrate` (uses the `tsx` dev dependency — run it before `npm prune`, or from a CI/ops checkout).
6. **Scale**: the in-memory rate limiter is per instance. With more than one instance, put rate limiting at the proxy or move the limiter to Redis.
7. **Logs**: production logs are JSON lines with `requestId`; ship them to your log platform. Add error tracking (e.g. Sentry) — not configured in this repo.

## Mobile

- **Web**: `EXPO_PUBLIC_API_URL=https://api.example.com/api/v1 npx expo export --platform web` → static files in `dist/`; host behind HTTPS with a Content-Security-Policy.
- **Android / iOS**: configure EAS (`npx eas build:configure`), set `EXPO_PUBLIC_API_URL` per build profile, `npx eas build -p android|ios`. See the README for building an APK locally or with EAS.
- Per-company icon / home-screen name requires a separate build profile per brand (runtime branding covers everything inside the app).

## Backup & restore

```bash
# Backup (daily, keep ≥7 days, store off-site, encrypt)
mongodump --uri="$MONGODB_URI" --gzip --archive=crm-$(date +%F).gz

# Restore into a scratch database first and verify, then into production
mongorestore --uri="$MONGODB_URI" --gzip --archive=crm-2026-11-03.gz --drop
```

Atlas users can use continuous cloud backup instead. Test a restore at least once per quarter.

## Release & rollback

1. CI (`.github/workflows/ci.yml`) must be green: backend typecheck/tests/build, mobile typecheck/lint/tests/doctor/web bundle, secret scan.
2. Back up the database.
3. Deploy the new backend build next to the old one; run `npm run migrate`; switch traffic once `/ready` is 200.
4. **Rollback**: switch traffic back to the previous build. The migration is additive (new fields, new collections) and safe for the old code, with one exception: removed plaintext refresh tokens mean users sign in once more. Restore the backup only if data was corrupted.
5. Publish the new mobile build / web export after the backend is live (the new app tolerates an older backend: missing branding falls back to the default theme).

## Credential rotation

If the old project archive or a real `.env` was ever shared: generate new `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (signs everyone out), change the MongoDB user's password, and review the Google OAuth client.
