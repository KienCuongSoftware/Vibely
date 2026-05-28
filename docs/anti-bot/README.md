# Anti-Bot Platform Documentation

Enterprise adaptive anti-abuse layer (TikTok / Cloudflare-class patterns).

## File structure

```
anti-bot/
├── README.md                 # This index
├── ARCHITECTURE.md           # Platform overview (existing)
├── EVENT_FLOW.md             # Telemetry flows (existing)
├── DEPLOYMENT.md             # Deploy notes (existing)
├── GRAFANA.md                # Metrics (existing)
├── AUTH_INTEGRATION.md         # Login/register enforcement
├── RISK_ENGINE.md              # Scoring & policy
├── CAPTCHA_SYSTEM.md           # Challenge types
└── TELEMETRY_AND_ABUSE.md      # Kafka & rules
```

## Quick links

| Topic | Document |
|-------|----------|
| System design | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Auth hardening | [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md) |
| Risk scoring | [RISK_ENGINE.md](RISK_ENGINE.md) |
| Captcha | [CAPTCHA_SYSTEM.md](CAPTCHA_SYSTEM.md) |
| Events | [TELEMETRY_AND_ABUSE.md](TELEMETRY_AND_ABUSE.md) |

**Backend:** `com.vibely.backend.antibot`  
**Frontend:** `frontend/src/security/`
