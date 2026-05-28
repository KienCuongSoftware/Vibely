# Logging & Distributed Tracing

## Logging

- Pattern: `%X{requestId}` in `application.yaml`
- `RequestCorrelationFilter` sets MDC from header or generates UUID
- Levels: INFO prod, DEBUG package-specific dev

## Structured logging (roadmap)

JSON logs → CloudWatch / Loki with fields: `requestId`, `userId`, `route`, `latencyMs`.

## Tracing (roadmap)

OpenTelemetry SDK → trace filter chain → controller → repository → Redis/Kafka spans. Export to Tempo/Jaeger. Correlate with logs via trace_id.

## 10–15.

PII: never log passwords, tokens, captcha solutions. Sampling: 10% prod traces.
