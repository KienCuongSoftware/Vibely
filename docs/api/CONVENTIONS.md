# API Conventions

## 1. Response envelope

```json
{
  "success": true,
  "data": { },
  "error": null
}
```

Failure:

```json
{
  "success": false,
  "data": null,
  "error": {
    "status": 400,
    "code": "BAD_REQUEST",
    "message": "Human-readable message"
  }
}
```

**Special:** HTTP 428 may include `data: { challengeLevel, riskScore }` for captcha.

## 2. Auth headers

| Header | When |
|--------|------|
| `Authorization: Bearer {accessToken}` | Protected routes |
| `X-Captcha-Verification` | Login, register, `send-code` (REGISTER / PASSWORD_RESET) when challenged |
| `X-Session-Id` | Anti-bot session |
| `X-Device-Hash` | Fingerprint |

## 3. Pagination

- Feed: `cursor` query param (opaque), `limit` optional
- Messages: `page`, `size` (verify defaults in controller)

## 4. Error codes

| Code | HTTP |
|------|------|
| `AUTH_REQUIRED` | 401 |
| `ACCESS_DENIED` | 403 |
| `NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | 400 |
| `RATE_LIMITED` | 429 |
| `CAPTCHA_REQUIRED` | 428 |
| `SUSPICIOUS_LOGIN` | 429 |

## 5. Versioning

- Share v1 under `/api/v1/videos/...`
- Future: `Accept-Version` header or path prefix `/api/v2`

## 6. WebSocket

STOMP connect: `/ws`  
Subscribe: `/user/queue/...`  
Send: `/app/...`

## 7–15.

Idempotency: share writes within window. Rate limits documented per route. CORS: configured origins only in prod.
