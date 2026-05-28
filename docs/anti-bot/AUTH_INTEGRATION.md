# Anti-Bot Auth Integration

## 1. Overview

`AuthProtectionService` enforces adaptive captcha on `POST /api/auth/login` and `POST /api/auth/register` before credentials are checked.

`POST /api/auth/send-code` requires a captcha token matching the OTP **purpose** (`REGISTER` or `PASSWORD_RESET`).

## 2. Purpose

Stop credential stuffing, bots, and replay attacks at the identity boundary.

## 3. Architecture

```
Client → X-Captcha-Verification (optional)
      → X-Session-Id, X-Device-Hash
      → AuthProtectionService.guard*  OR  OtpVerificationService (send-code)
      → VerificationTokenStore.validateUnused() on guard
      → AuthService.login/register (success)
      → VerificationTokenStore.consume() only after success
```

## 4. System Design

**Headers:**

| Header | Purpose |
|--------|---------|
| `X-Captcha-Verification` | HMAC token after captcha (purpose-bound) |
| `X-Session-Id` | Behavior/risk session |
| `X-Device-Hash` | Fingerprint hash |

**HTTP codes:**

- `428 CAPTCHA_REQUIRED` + `{ challengeLevel, riskScore }`
- `429 SUSPICIOUS_LOGIN` — failure threshold exceeded
- `400` — invalid/reused captcha token, invalid OTP

**Captcha purposes (`CaptchaPurpose` enum):**

| Purpose | Used when |
|---------|-----------|
| `LOGIN` | `POST /api/auth/login` |
| `REGISTER` | `POST /api/auth/register`, `send-code` with purpose REGISTER |
| `PASSWORD_RESET` | `send-code` with purpose PASSWORD_RESET |

**Verification token lifecycle:**

| Step | Behavior |
|------|----------|
| `guardLogin` / `guardRegister` | `validateUnused` — does **not** consume |
| Successful login/register | `consumeLoginVerification` / `consumeRegisterVerification` |
| Failed login/register (wrong password, validation) | Token remains valid for retry |
| `send-code` | `validateUnused` with REGISTER or PASSWORD_RESET purpose |
| `reset-password` | Consumes OTP row (not the captcha verification token) |

**Escalation (failed logins / hour):**

2 → CHECKBOX · 4 → ROTATE · 7 → SLIDER · 12 → MULTI_STEP

## 5. Frontend

- `useAntiBot` + `ChallengeModal` on `LoginPage`, `SignupPage`
- `ChallengeModal`: auto-submit on pointer up (ROTATE/SLIDER), no confirm button
- `clearVerificationToken()` when captcha token expires or after successful login
- Forgot password: captcha `PASSWORD_RESET` before `send-code`

## 6–15.

Token format: `verify:{PURPOSE}:challengeId.expires.signature`. Single-use via `ab:verify:used:{hash}`. See [RISK_ENGINE.md](RISK_ENGINE.md). Monitor: `antibot.login.failed`, 428 rate.
