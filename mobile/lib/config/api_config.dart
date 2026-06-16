/// API base URL. Override at build/run time:
/// `flutter run --dart-define=VIBELY_API_BASE=https://vibely.sbs`
class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'VIBELY_API_BASE',
    defaultValue: 'https://vibely.sbs',
  );

  static const String defaultAvatarPath = '/images/users/default-avatar.jpeg';

  static String resolveAssetUrl(String? path) {
    final raw = path?.trim() ?? '';
    if (raw.isEmpty) return '$baseUrl$defaultAvatarPath';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('/')) return '$baseUrl$raw';
    return '$baseUrl/$raw';
  }
}
