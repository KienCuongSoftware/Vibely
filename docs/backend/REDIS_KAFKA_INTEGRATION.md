# Redis & Kafka Integration

## 1. Overview

Redis is **optional** (`app.redis.enabled`). Kafka is **optional** for anti-bot telemetry (`app.antibot.kafka-enabled`).

## 2. Purpose

Sub-millisecond cache, distributed rate limits, captcha/session store, explore page cache.

## 3. Architecture

**Redis key families:**

| Prefix | Module | Use |
|--------|--------|-----|
| `{prefix}:explore:*` | explore | Page DTO cache |
| `{prefix}:sl:*` | share | Short links |
| `{prefix}:ratelimit:*` | share, antibot | Sliding windows |
| `ab:captcha:*` | antibot | Challenge sessions |
| `ab:verify:used:*` | antibot | Replay prevention |
| `ab:trust:*` | antibot | Trust cache |

Bean: `shareStringRedisTemplate` from `ShareRedisConfiguration`.

## 4. Kafka

Topics: `login-events`, `captcha-events`, `risk-events`, `behavior-events`, `abuse-events`.

Publisher: `KafkaAntiBotTelemetryPublisher` when enabled.

Consumer: inline `AbuseRulesEngine` via `CompositeAntiBotTelemetryPublisher`.

## 5–15.

**Failure:** Redis down → in-memory fallbacks (dev-unsafe at scale). **Prod:** require Redis for anti-bot replay safety.

**Monitoring:** Redis memory, evictions, Kafka lag.
