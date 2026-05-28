# Security Platform Model

## 1. Overview

Defense in depth: edge (WAF/CDN) → application (auth, anti-bot, rate limits) → data (encryption, least privilege).

## 2. Controls

| Layer | Control |
|-------|---------|
| Edge | TLS 1.3, WAF, bot score headers |
| API | JWT, RBAC, validation, CORS |
| Abuse | Anti-bot platform, IP reputation |
| Data | BCrypt, hashed refresh tokens, presigned S3 |
| Client | CSP (roadmap), XSS-safe React defaults |

## 3. XSS / CSRF

- React escapes by default; avoid `dangerouslySetInnerHTML`
- SPA uses Bearer token — CSRF not applicable to API
- OAuth state parameter validated by Spring

## 4. Secrets

- Never commit `.env` with prod secrets
- `ANTIBOT_HMAC_SECRET`, `DB_PASSWORD`, OAuth client secrets via env/Secrets Manager

## 5–15.

Replay: captcha verification single-use Redis keys. Token theft: short access TTL + refresh rotation. Audit: `anti_bot_risk_events`, login telemetry. Future: mTLS internal, hardware key JWT signing.
