# Testing Strategy

## 1. Pyramid

| Layer | Scope | Tools |
|-------|-------|-------|
| Unit | Services, codecs, risk rules | JUnit 5, Mockito |
| Integration | Repositories, Redis | `@DataJpaTest`, Testcontainers |
| API | Controllers | MockMvc, RestAssured |
| E2E | Critical paths | Playwright (roadmap) |
| Load | Feed, auth | k6, Gatling |
| Media | FFmpeg outputs | Fixture videos, snapshot playlists |

## 2. Backend

- `spring-security-test` for auth scenarios
- Testcontainers: PostgreSQL + Redis in CI
- Share module has Redis cache tests

## 3. Frontend

- Vitest + React Testing Library (`MessagesPage` tests exist)
- Component tests for feed player mocks

## 4. WebSocket

- Integration test: STOMP connect, publish, receive

## 5. Anti-bot

See [SECURITY_AND_ANTIBOT.md](SECURITY_AND_ANTIBOT.md).

## 6–15.

CI: run unit+integration on PR; nightly load test. Coverage target: 70% services (aspirational). Flaky test policy: quarantine tag.
