# Anti-Bot Event Flow

## Login with adaptive challenge

```mermaid
flowchart TD
  A[User opens Login] --> B[bootstrapAntiBot]
  B --> C[POST /api/fingerprint/register]
  C --> D[User submits credentials]
  D --> E[POST /api/risk/evaluate]
  E --> F{challengeRequired?}
  F -- No --> G[POST /api/auth/login]
  F -- Yes --> H[GET /api/captcha/challenge]
  H --> I[User solves rotate captcha]
  I --> J[POST /api/captcha/verify + behavior samples]
  J --> K{verified?}
  K -- No --> H
  K -- Yes --> L[Store verification token]
  L --> G
```

## Telemetry topics

| Topic | Producer | Payload |
|-------|----------|---------|
| `risk-events` | RiskEngine | score, level, session |
| `captcha-events` | CaptchaService | create/verify/fail |
| `behavior-events` | BehaviorAnalysisService | entropy, suspicious |
| `interaction-events` | FingerprintService | device hash |
| `login-events` | Auth (future) | success/fail |
| `abuse-events` | AbuseDetection (future) | coordinated signals |

Default dev mode logs events via `LoggingAntiBotTelemetryPublisher`. Enable Kafka with `app.antibot.kafka-enabled=true`.
