# Deployment Strategy

## Components

1. **Spring Boot API** — hosts all anti-bot modules (`com.vibely.backend.antibot`)
2. **Redis** — captcha sessions, rate limits, trust cache (required for multi-instance)
3. **PostgreSQL** — audit tables (Flyway `V28__anti_bot_platform.sql`)
4. **Kafka** (optional) — async telemetry fan-out

## Environment variables

| Variable | Description |
|----------|-------------|
| `ANTIBOT_HMAC_SECRET` | HMAC key for challenge + verification tokens |
| `ANTIBOT_AUTH_PROTECTION_ENABLED` | `true` to guard login/register with captcha (dev profile defaults `false` for E2E) |
| `ANTIBOT_ALWAYS_REQUIRE_CAPTCHA_ON_AUTH` | `true` to always require **slider** on login/register |
| `SPRING_DATA_REDIS_HOST` | Redis host |
| `DB_PASSWORD` | PostgreSQL password |

## Rollout

1. Apply migration `V28` on staging.
2. Deploy backend with `app.antibot.enabled=true`.
3. Deploy frontend with `src/security` SDK.
4. Monitor captcha fail rate and risk score histogram.
5. Enable Kafka consumers for abuse rules (phase 2).

## CDN / WAF

- Terminate TLS at CloudFront + AWS WAF.
- Forward `X-Forwarded-For`, optional `X-Bot-Score`.
- Set strict CSP on web origin; allow API connect-src to backend.
