# Search

Global search (users, videos, hashtags, trending, history) lives in the **`search`** Spring module and the React **`components/search/`** tree. Explore still exposes a separate **paginated video search** for discovery grids.

| File | Description |
|------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | `/api/search/*`, suggest cache, frontend routes |

## API entry points

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/search/suggest?q=` | Public |
| GET | `/api/search/users?q=` | Public |
| GET | `/api/search/videos?q=` | Public |
| GET | `/api/search/hashtags?q=` | Public |
| GET | `/api/search/trending` | Public |
| GET | `/api/search/history` | Bearer |
| POST | `/api/search/history` | Bearer |
| DELETE | `/api/search/history` | Bearer — clear all |
| DELETE | `/api/search/history/{id}` | Bearer — remove one entry |

## Related (not this module)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/explore/search?q=` | Cursor-paginated explore video search (`ExploreService`) |

## Frontend entry points

| Route / component | Role |
|-------------------|------|
| `/search?q=` | `SearchResultsPage` — Top / Users / Videos |
| `WatchSearchDropdown` | Suggest-only panel on `VideoWatchPage` (no history rows) |
| `useSearch` + `useSearchNavigation` | Debounced suggest + navigation to `/search` |
| Explore | `apiClient.searchExplore` → `/api/explore/search` (when wired) |
