# Backend Documentation

## File structure

```
backend/
├── README.md
├── SPRING_BOOT_ARCHITECTURE.md
├── MODULE_STRUCTURE.md
├── PERSISTENCE_AND_TRANSACTIONS.md
└── REDIS_KAFKA_INTEGRATION.md
```

| Document | Topics |
|----------|--------|
| [SPRING_BOOT_ARCHITECTURE.md](SPRING_BOOT_ARCHITECTURE.md) | Layers, config, security |
| [MODULE_STRUCTURE.md](MODULE_STRUCTURE.md) | Package map, DDD |
| [PERSISTENCE_AND_TRANSACTIONS.md](PERSISTENCE_AND_TRANSACTIONS.md) | JPA, Flyway |
| [REDIS_KAFKA_INTEGRATION.md](REDIS_KAFKA_INTEGRATION.md) | Cache, telemetry |

**Code root:** `backend/src/main/java/com/vibely/backend/`

## Current stack

Spring Boot 3.5, Java 17, Maven wrapper, Spring Web/Security/JPA/WebSocket/Mail/OAuth2 Client, Flyway, PostgreSQL, Redis support, optional Kafka telemetry, AWS S3 SDK, FFmpeg/FFprobe integration, Actuator, Caffeine, MaxMind GeoIP, Lombok, JUnit/Spring Security Test.

## Main packages

`auth`, `account`, `security`, `video`, `feed`, `explore`, `search`, `interaction`, `chat`, `notification`, `share`, `storage`, `processing`, `studio`, `admin`, `antibot`, `user`, `discovery`, and `observability`.

## Config and run

Config files live in `backend/src/main/resources/application.yaml`, `application-dev.yaml`, `application-prod.yaml`, and optional gitignored `application-local.yaml`.

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
./mvnw test
```

On Windows PowerShell, use `.\mvnw.cmd`.
