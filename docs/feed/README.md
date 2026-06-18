# Feed System Documentation

| File | Description |
|------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Ranking, pagination, caching |
| [RANKING_AND_PERSONALIZATION.md](RANKING_AND_PERSONALIZATION.md) | Scores, hooks for ML |

**API:** `GET /api/feed`, `GET /api/feed/for-you`, `GET /api/feed/following`

`/api/feed/for-you` is public and used by the Flutter mobile For You tab. `/api/feed/following` requires Bearer auth; anonymous requests should fail with an auth error rather than a server error.

**Code:** `com.vibely.backend.feed`, `com.vibely.backend.video.VideoService`
