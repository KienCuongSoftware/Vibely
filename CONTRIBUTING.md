# Contributing Guide

Thanks for your interest in contributing to Vibely.

## Development Setup

### Backend

```bash
cd backend
mvn spring-boot:run
```

Required environment variable:

- `DB_PASSWORD`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Branching

- Create a feature branch from `main`.
- Keep each pull request focused on one change.

## Commit Messages

- Use clear, descriptive commit messages.
- Prefer small commits over one large commit.

## Pull Requests

Before opening a PR:

- Ensure backend starts successfully.
- Ensure frontend builds successfully.
- Update documentation for behavior/config changes.
- Fill out `PR_DESCRIPTION.md`.

## Code Style

- Follow existing project conventions.
- Keep code readable and maintainable.
- Add tests where applicable.

## Communication

For questions, open an issue or contact:

- GitHub: [KienCuongSoftware](https://github.com/KienCuongSoftware)
