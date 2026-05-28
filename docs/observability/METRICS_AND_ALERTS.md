# Metrics & Alerting

## 1. Overview

Spring Actuator exposes `/actuator/prometheus`. Custom metrics via `AntiBotMetrics` and Micrometer.

## 2. Key metrics

| Metric | Alert threshold |
|--------|-----------------|
| `http.server.requests` p95 | > 500ms sustained |
| `antibot.login.failed` | spike 5x baseline |
| `antibot.captcha.failed` | > 40% rate |
| JVM heap | > 85% |
| Hikari connections | pool exhausted |

## 3. Grafana dashboards

- API golden signals
- Anti-bot security
- Processing queue depth (roadmap)

## 4–15.

Tracing: OpenTelemetry Java agent → Tempo. Logging: JSON structured, `requestId` field. On-call: PagerDuty integration (roadmap).
