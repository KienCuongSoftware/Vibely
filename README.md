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
   - (optional for production) `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
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

`backend/src/main/resources/database/migration`

Migrations run automatically when the backend starts.

## Contributing

Please read `CONTRIBUTING.md` before opening pull requests.

## Security

Please report vulnerabilities following [SECURITY.md](./SECURITY.md).

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
