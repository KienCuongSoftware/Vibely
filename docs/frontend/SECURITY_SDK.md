# Frontend Security SDK

## Location

`frontend/src/security/`

## Modules

| Path | Role |
|------|------|
| `fingerprint/collectFingerprint.js` | Canvas, WebGL, UA |
| `antiAutomation/detectAutomation.js` | webdriver, headless |
| `behavior/BehaviorTracker.js` | Pointer samples |
| `sdk/antiBotClient.js` | API client |
| `captcha/*` | ChallengeModal, Rotate, Slider, Checkbox |
| `hooks/useAntiBot.js` | Login/register integration |
| `headers/buildAntiBotHeaders.js` | Auth headers |
| `pages/LoginPage.jsx` | Credentials + forgot password (`view: forgot`) |
| `pages/SignupPage.jsx` | OTP send-code, register |

## Flow

1. `bootstrapAntiBot()` on app load
2. `ensureHuman()` before auth / send-code
3. On 428 → open `ChallengeModal`
4. `storeVerificationToken` → subsequent requests include header
5. `clearVerificationToken()` after successful login/register or when captcha token is invalid

**ChallengeModal `purpose`:** `LOGIN` (sign-in), `REGISTER` (signup / signup OTP), `PASSWORD_RESET` (forgot-password send code).

## Forgot password

Xem [auth/PASSWORD_RESET.md](../auth/PASSWORD_RESET.md).

See [anti-bot/AUTH_INTEGRATION.md](../anti-bot/AUTH_INTEGRATION.md).
