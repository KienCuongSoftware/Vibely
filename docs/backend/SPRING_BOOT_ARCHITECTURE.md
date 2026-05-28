# Spring Boot Architecture

## 1. Overview

Vibely backend is **Spring Boot 3.5** on Java 17: single deployable artifact, embedded Tomcat, JPA/Hibernate, Spring Security, Spring Data Redis, optional Spring Kafka.

## 2. Purpose

Provide a consistent, testable server platform for REST, WebSocket, and background processing.

## 3. Architecture

```
Controller → Service (@Transactional) → Repository → Entity
                ↓
         Domain helpers / DTOs
                ↓
         Infrastructure (S3, Redis, Kafka, FFmpeg)
```

## 4. System Design

- **Configuration:** `application.yaml` + profile `dev` + optional `application-local.yaml`
- **API envelope:** `ApiResponse<T>` with `success`, `data`, `error`
- **Errors:** `GlobalExceptionHandler` — 400, 404, 428 CAPTCHA_REQUIRED, 429 SUSPICIOUS_LOGIN
- **Profiles:** `app.redis.enabled`, `app.antibot.kafka-enabled`, `app.processing.worker.enabled`

## 5. Data Flow

DTOs at boundary; entities never exposed. MapStruct or manual mapping in services.

## 6. Sequence Flows

Standard POST: validate `@Valid` → service → repository → `ApiResponse.success`.

## 7. Scaling Strategy

- Horizontal replicas behind LB
- HikariCP pool tuning per vCPU
- Separate worker deployment for `processing`

## 8. Performance

- `spring.jpa.open-in-view: false`
- Batch inserts for view counters where applicable
- Caffeine for local fallback caches

## 9. Security

- `SecurityConfig` filter chain
- `@EnableMethodSecurity` for fine-grained rules
- BCrypt password hashing

## 10. Failure Scenarios

- Uncaught exceptions → 500 without stack trace to client
- Flyway validation — `validate-on-migrate` configurable in dev

## 11. Recovery

- Actuator health for k8s probes
- Flyway repair for checksum drift (dev documented in YAML comment)

## 12. Tradeoffs

Monolith vs microservices — monolith for velocity.

## 13. Future

- Spring Modulith enforcement
- Virtual threads for I/O heavy endpoints

## 14. Production Hardening

- Disable `show-sql` in prod
- Restrict actuator exposure

## 15. Monitoring

- Actuator prometheus
- Request correlation MDC
