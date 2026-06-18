# REST API Reference (Summary)

## Health

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/health` | No |
| GET | `/api/health/readiness` | No |

## Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/register` | `X-Captcha-Verification` when required |
| POST | `/api/auth/login` | Same |
| POST | `/api/auth/refresh` | Body: refreshToken |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/me` | Bearer |
| POST | `/api/auth/send-code` | Body: `email`, `purpose` (`REGISTER` \| `PASSWORD_RESET`); captcha header when required |
| POST | `/api/auth/verify-code` | Body: `email`, `code`, optional `purpose` |
| POST | `/api/auth/reset-password` | Body: `email`, `code`, `newPassword` |
| POST | `/api/auth/oauth/exchange` | |
| POST | `/api/auth/oauth/native` | Mobile Google/Facebook; `X-Vibely-Client: mobile` |
| POST | `/api/auth/complete-onboarding` | Bearer; body `username`, `birthDate` |

`GET /api/auth/me` returns `401 AUTH_REQUIRED` for invalid Bearer tokens. A request without Bearer may return a successful envelope with `data: null`.

## Feed & video

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/feed` | No |
| GET | `/api/feed/for-you` | No |
| GET | `/api/feed/following` | Bearer |
| GET | `/api/videos/{id}` | No |
| POST | `/api/videos` | Bearer |
| POST | `/api/videos/upload/presign` | Bearer |
| POST | `/api/videos/{id}/views` | No |

## Users, profile, follows

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/users/{username}` | Optional Bearer |
| GET | `/api/users/{username}/videos?page=&size=` | Optional Bearer |
| GET | `/api/users/me/videos?page=&size=` | Bearer |
| GET | `/api/follows/friends` | Bearer |
| POST | `/api/follows/{userId}` | Bearer |
| DELETE | `/api/follows/{userId}` | Bearer |

## Explore

| Method | Path |
|--------|------|
| GET | `/api/explore/categories` |
| GET | `/api/explore/trending` |
| GET | `/api/explore/search` |
| GET | `/api/explore/category/{slug}` |
| GET | `/api/explore/topic/{slug}` |
| GET | `/api/explore/video/{publicId}/related` |

## Search (global)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/search/suggest?q=` | No |
| GET | `/api/search/users?q=&limit=` | No |
| GET | `/api/search/videos?q=&limit=` | No |
| GET | `/api/search/hashtags?q=&limit=` | No |
| GET | `/api/search/trending?limit=` | No |
| GET | `/api/search/history?limit=` | Bearer |
| POST | `/api/search/history` | Bearer — body `{ "query": "..." }` |
| DELETE | `/api/search/history` | Bearer — clear all |
| DELETE | `/api/search/history/{id}` | Bearer — remove one entry |

Suggest response shape: `{ trending[], users[], hashtags[], videos[] }`.

## Chat

| Method | Path |
|--------|------|
| GET | `/api/chat/conversations` |
| POST | `/api/chat/conversations/direct/{userId}` |
| GET | `/api/chat/conversations/{id}/messages` |
| POST | `/api/chat/conversations/{id}/messages` |
| POST | `/api/chat/conversations/{id}/accept` |
| POST | `/api/chat/conversations/{id}/reject` |
| POST | `/api/chat/conversations/{id}/delete` |

## Anti-bot

| Method | Path |
|--------|------|
| POST | `/api/risk/evaluate` |
| GET | `/api/captcha/challenge` |
| POST | `/api/captcha/verify` |
| POST | `/api/fingerprint/register` |
| POST | `/api/behavior/track` |
| POST | `/api/trust/evaluate` |

## Share

| Method | Path |
|--------|------|
| GET | `/v/{shortCode}` | Redirect |
| POST | `/api/v1/videos/{id}/share` | |

Full OpenAPI generation — roadmap (`springdoc-openapi`).
