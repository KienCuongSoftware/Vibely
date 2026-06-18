# Vibely Mobile

Flutter client for Vibely, pointed at the same production API used by the web app.

## Current Scope

- TikTok-style For You feed with video playback.
- Email login/register with OTP and onboarding.
- Native Google and Facebook sign-in through the mobile SDKs.
- Profile, search, friends/following feed, and protected-route login gates.

## Requirements

| Tool | Notes |
|------|-------|
| Flutter SDK | Stable channel recommended |
| Android SDK | Debug builds use package `com.example.mobile` |
| Java/Gradle | Managed by Flutter/Android tooling |

## Run

```powershell
cd D:\Worksplace\FullStack\Vibely\mobile
flutter pub get
flutter run
```

The app targets `https://vibely.sbs` by default. Use hot restart (`R`) after config or auth flow changes.

## OAuth Configuration

Public mobile identifiers live in code/resources:

| Provider | Value |
|----------|-------|
| Android package | `com.example.mobile` |
| Facebook App ID | `2213321186098020` |
| Facebook client token | `mobile/android/app/src/main/res/values/strings.xml` |
| Facebook debug key hash | `hTFBqmsGR52wvupKtY+Q1+2J3GA=` |
| Google Web client ID | `mobile/lib/config/oauth_config.dart` |

Facebook App Secret and Google client secrets are server-side only. Do not put them in the mobile app.

### Facebook Checklist

1. Meta Developer app has Android platform configured:
   - Package name: `com.example.mobile`
   - Key hash: `hTFBqmsGR52wvupKtY+Q1+2J3GA=`
   - Client token matches `strings.xml`
2. Backend has the app secret configured on the VPS.
3. If the Meta app is in Development mode, the Facebook account used on-device must be added under Roles/Testers.

### Google Checklist

1. Google Cloud has an Android OAuth client for package `com.example.mobile` and the debug SHA-1 from `OAuthService.debugSha1`.
2. The Web client ID in `OAuthConfig.googleServerClientId` matches the backend Google client ID.
3. `google_sign_in` returns an `idToken`; Android client misconfiguration usually surfaces as `ApiException: 10`.

## Useful Files

| Area | Paths |
|------|-------|
| API client | `lib/api/api_client.dart`, `lib/api/auth_api.dart` |
| Auth state | `lib/auth/auth_controller.dart`, `lib/config/auth_config.dart` |
| OAuth | `lib/features/auth/oauth_service.dart`, `lib/config/oauth_config.dart` |
| Login/register UI | `lib/features/auth/` |
| Feed | `lib/features/for_you/` |
| Profile/search | `lib/features/profile/`, `lib/features/search/` |

## Troubleshooting

- `Không xác minh được token Facebook`: backend secret/config is missing or the old JAR is still running. See `docs/deployment/README.md`.
- `Invalid OAuth access token - Cannot parse access token` from a curl test using `"test"` is expected; it proves the backend can call Facebook with valid app credentials.
- Profile says the session expired: the app had a stale JWT; log in again.
- Video playback logs from Android MediaCodec/ExoPlayer are usually noise unless playback visibly fails.
