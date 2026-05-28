# Grafana Observability

## Metrics exposed

Spring Actuator + Micrometer Prometheus endpoint:

- `GET /actuator/prometheus`

Custom anti-bot metrics:

| Metric | Description |
|--------|-------------|
| `antibot_events_total` | Events by topic + event tag |
| `antibot_login_failed_total` | Failed login count |
| `antibot_captcha_failed_total` | Captcha verification failures |
| `antibot_captcha_success_total` | Captcha verification success |
| `antibot_risk_score` | Risk score summary |

## Local Prometheus scrape

```yaml
scrape_configs:
  - job_name: vibely-backend
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["host.docker.internal:8080"]
```

## Suggested dashboards

1. **Risk overview** — avg `antibot_risk_score`, challenge tier distribution
2. **Auth protection** — `antibot_login_failed_total` rate, 428 responses
3. **Captcha health** — success/fail ratio, solve latency (from logs)
4. **Abuse signals** — `abuse-events` Kafka topic throughput

## Alerts

- Captcha fail rate > 40% for 10m
- Login failures from single IP > 100/hour
- Risk score p95 > 80 for 15m
