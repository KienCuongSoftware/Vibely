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

## Captcha gate

- `AuthProtectionService` on login/register
- Headers documented in [api/CONVENTIONS.md](../api/CONVENTIONS.md)

## CORS

- Explicit allowlist `app.cors.allowed-origins`
- Credentials enabled for cookie roadmap
