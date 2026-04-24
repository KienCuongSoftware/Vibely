# Vibely

Vibely is a full-stack short-video platform inspired by TikTok.

## Tech Stack

- Backend: Spring Boot, Spring Security, Spring Data JPA, Flyway, PostgreSQL
- Frontend: React, Vite, Tailwind CSS

## Project Structure

- `backend/`: Java Spring Boot API and database migrations
- `frontend/`: React client application

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.9+
- Node.js 20+
- PostgreSQL

### Backend

1. Create a PostgreSQL database named `vibely`.
2. Set environment variables:
   - `DB_PASSWORD`
   - `JWT_SECRET`
   - (optional for production) `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `CORS_ALLOWED_ORIGINS`
3. Run the backend:

```bash
cd backend
mvn spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Database Migrations

Flyway migration scripts are located at:

`backend/src/main/resources/db/migration`

Migrations run automatically when the backend starts.

## API Notes

- All API responses use a consistent envelope:
  - success: `{ "success": true, "data": ... }`
  - error: `{ "success": false, "error": { "status": ..., "message": ... } }`
- Feed supports pagination and sort:
  - `GET /api/feed?page=0&size=10&sort=latest`
  - `GET /api/feed?page=0&size=10&sort=trending-lite`
- Following feed endpoint:
  - `GET /api/feed/following?page=0&size=10`
- Readiness check:
  - `GET /api/health/readiness`

## Security and Operations

- Access token + refresh token flow is enabled for auth.
- Request size limits are configured for upload metadata endpoints.
- Request correlation ID is returned via `X-Request-Id` response header.

## Contributing

Please read `CONTRIBUTING.md` before opening pull requests.

## Security

Please report vulnerabilities following [SECURITY.md](./SECURITY.md).

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
