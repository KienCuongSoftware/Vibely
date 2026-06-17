/// OAuth client IDs for native sign-in (public identifiers, not secrets).
///
/// Override at build time:
/// `flutter run --dart-define=GOOGLE_SERVER_CLIENT_ID=... --dart-define=FACEBOOK_APP_ID=...`
class OAuthConfig {
  OAuthConfig._();

  /// Web client ID from Google Cloud Console — used as `serverClientId` on mobile
  /// and must match `spring.security.oauth2.client.registration.google.client-id` on backend.
  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue:
        '105156447095-1vgao1r8e7tfcgevqu9p9liduvvih51i.apps.googleusercontent.com',
  );

  static const String facebookAppId = String.fromEnvironment(
    'FACEBOOK_APP_ID',
    defaultValue: '2213321186098020',
  );
}
