# OAuth & Onboarding

## Providers

- Google (`/oauth2/authorization/google`)
- Facebook
- LINE (custom redirect URI config)

## Flow

```
Browser → OAuth provider
  → callback /login/oauth2/code/{provider}
  → OAuth2LoginSuccessHandler
  → upsert user
  → one-time code → frontend /login?oauth=success&code=
  → POST /api/auth/oauth/exchange
```

## Onboarding

- `needsOnboarding` flag for new OAuth users
- `tmp.*` username until Vibely ID chosen
- `POST /api/auth/complete-onboarding` — birth date + username

## Security

- State/nonce handled by Spring OAuth2
- Do not pass access tokens in URL except short-lived exchange code

## OTP email

Six-digit codes sent via SMTP. HTML templates use Vietnamese copy for end users (TikTok-style layout). Sample config: `backend/application-local.yaml.example`.

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
