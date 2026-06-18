# OAuth & Onboarding

## Providers

- Google browser OAuth (`/oauth2/authorization/google`) and native mobile Google Sign-In.
- Facebook browser OAuth and native mobile Facebook Login.
- LINE browser OAuth (custom redirect URI config).

## Browser Flow

```
Browser → OAuth provider
  → callback /login/oauth2/code/{provider}
  → OAuth2LoginSuccessHandler
  → upsert user
  → one-time code → frontend /login?oauth=success&code=
  → POST /api/auth/oauth/exchange
```

The browser flow keeps provider tokens server-side. The frontend receives a short-lived exchange code and calls `POST /api/auth/oauth/exchange` to receive the normal Vibely session.

## Native Mobile Flow

Flutter uses the native SDKs and sends provider tokens to the backend:

```http
POST /api/auth/oauth/native
X-Vibely-Client: mobile
Content-Type: application/json

{
  "provider": "facebook",
  "accessToken": "<facebook access token>"
}
```

```http
POST /api/auth/oauth/native
X-Vibely-Client: mobile
Content-Type: application/json

{
  "provider": "google",
  "idToken": "<google id token>"
}
```

Backend validation:

- Google: verifies `idToken` with Google's `tokeninfo` endpoint and checks `aud` equals the configured Web client ID.
- Facebook: calls `debug_token` with `appId|appSecret`, checks `is_valid` and `app_id`, then fetches `/me?fields=id,name,email,picture.type(large)`.
- Mobile sessions expose the access token in the response body/header path guarded by `X-Vibely-Client: mobile`; web sessions continue to use cookie-compatible behavior.

## Onboarding

- `needsOnboarding` flag for new OAuth users
- `tmp.*` username until Vibely ID chosen
- `POST /api/auth/complete-onboarding` — birth date + username

## Security

- State/nonce handled by Spring OAuth2
- Do not pass access tokens in URL except short-lived exchange code
- Native mobile OAuth tokens are POSTed over HTTPS and verified server-side before creating a Vibely JWT.
- Facebook App Secret and Google client secrets are backend-only. The mobile app contains only public IDs/client tokens.
- `GET /api/auth/me` returns `401 AUTH_REQUIRED` when an invalid Bearer token is supplied; unauthenticated requests without Bearer may return `data: null`.

## Production/VPS OAuth Config

The current VPS service reads `/opt/vibely/vibely.env` and imports `/opt/vibely/config/application-local.yaml`.

Recommended Facebook env entries:

```bash
FACEBOOK_APP_ID=2213321186098020
FACEBOOK_APP_SECRET=...
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_FACEBOOK_CLIENT_ID=2213321186098020
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_FACEBOOK_CLIENT_SECRET=...
```

Google must use the same Web client ID on backend and mobile:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

After editing VPS config:

```bash
systemctl restart vibely
```

Facebook diagnostic with a fake token should return a Facebook invalid-token message, not a generic config error:

```bash
curl -X POST http://127.0.0.1:8080/api/auth/oauth/native \
  -H "Content-Type: application/json" \
  -H "X-Vibely-Client: mobile" \
  -d '{"provider":"facebook","accessToken":"test"}'
```

## OTP email

Six-digit codes sent via SMTP. HTML templates use Vietnamese copy for end users (TikTok-style layout). Local secrets are normally stored in `backend/src/main/resources/application-local.yaml`; the VPS uses `/opt/vibely/config/application-local.yaml` plus `/opt/vibely/vibely.env`.

`POST /api/auth/send-code` accepts `purpose`:

| Value | Description |
|-------|-------------|
| `REGISTER` (default) | New account signup |
| `PASSWORD_RESET` | Password reset — see [PASSWORD_RESET.md](PASSWORD_RESET.md) |

Each purpose has separate OTP rows in `otp_verification_codes.purpose` (Flyway V29).

| Variable | Meaning |
|----------|---------|
| `APP_MAIL_ENABLED=true` | Enable outbound email |
| `SMTP_HOST` / `SMTP_PORT` | SMTP server (Gmail: `smtp.gmail.com`, `587`) |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | Account + App Password |
| `APP_MAIL_EXPOSE_CODE=false` | Do not return code in API response |

When mail is disabled, the API may return `demoCode` for manual entry in dev UI.
