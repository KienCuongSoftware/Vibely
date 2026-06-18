# API Security & Auth Hardening

## Rate limiting

| Route class | Limit |
|-------------|-------|
| `/api/auth/*` | 20/min/IP (in-memory filter) |
| Share redirect | Redis per IP |
| Share write | Redis per subject |
| Anti-bot evaluate | Redis 120/min |

## JWT

- Validate signature and expiry on every protected route
- No sensitive claims in payload
- Invalid Bearer tokens return `401 AUTH_REQUIRED`; `/api/auth/me` without Bearer may return `data: null`

## Native mobile OAuth

- `POST /api/auth/oauth/native` verifies Google/Facebook tokens server-side before issuing a Vibely JWT
- Mobile sends `X-Vibely-Client: mobile` so the backend can expose the access token for native storage
- Facebook App Secret and Google client secrets must stay in backend/VPS config, never in Flutter resources

## Captcha gate

- `AuthProtectionService` on login/register
- Headers documented in [api/CONVENTIONS.md](../api/CONVENTIONS.md)

## CORS

- Explicit allowlist `app.cors.allowed-origins`
- Credentials enabled for cookie roadmap
