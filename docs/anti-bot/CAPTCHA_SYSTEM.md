# CAPTCHA System

## 1. Overview

Challenge types: **CHECKBOX**, **ROTATE**, **SLIDER**, **MULTI_STEP** (checkbox + rotate). Procedural image generation server-side; React render client-side.

Purposes: `LOGIN`, `REGISTER`, `PASSWORD_RESET`, `COMMENT`, `UPLOAD`, `SHARE`, `MESSAGE`, `GENERIC`.

## 2. Purpose

Prove human interaction under elevated risk.

## 3. Architecture

```
GET /api/captcha/challenge?level=ROTATE
→ CaptchaSession in Redis
→ POST /api/captcha/verify + behavior samples
→ BehaviorAnalysisService entropy check
→ verification token (purpose-bound)
```

## 4. Components

| Component | Role |
|-----------|------|
| `RotateCaptchaImageGenerator` | Outer ring + inner disc layers; random `correctAngle`; verify relative rotation |
| `SliderCaptchaImageGenerator` | Bezier puzzle mask (local coords on piece canvas), warp, noise |
| `SliderCaptcha.jsx` | Piece follows range input; `challengeKey` resets offset |
| `ChallengeModal.jsx` | Auto-verify on pointer up (ROTATE/SLIDER/CHECKBOX) |
| `CaptchaSessionStore` | Redis / in-memory |
| `AntiBotTokenSigner` | HMAC tokens |

## 5. Slider puzzle

- Background 320×180; hole at random `(targetX, targetY)`
- Piece image: mask in **local** coordinates (6px pad), not absolute background coords on the 64×64 canvas
- Client sends `sliderOffset`; server compares to `sliderTargetX` (tolerance `app.antibot.slider-tolerance-px`)

## 6. Rotate puzzle

- Server returns `imageBase64` (outer) + `puzzleBase64` (inner disc)
- Slider 0–360°; verify: `displayRotation + userRotation ≡ correctAngle (mod 360)`

## 7–15.

Min/max solve time anti-automation. Multi-step: rotate + checkbox. Security: constant-time HMAC, session TTL 120s. Monitor: captcha success/fail metrics.
