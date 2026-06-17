class AuthSession {
  const AuthSession({
    this.userId,
    this.username,
    this.displayName,
    this.email,
    this.accessToken,
    this.needsOnboarding = false,
    this.avatarUrl,
  });

  final int? userId;
  final String? username;
  final String? displayName;
  final String? email;
  final String? accessToken;
  final bool needsOnboarding;
  final String? avatarUrl;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      userId: json['userId'] is num ? (json['userId'] as num).toInt() : null,
      username: json['username']?.toString(),
      displayName: json['displayName']?.toString(),
      email: json['email']?.toString(),
      accessToken: json['accessToken']?.toString(),
      needsOnboarding: json['needsOnboarding'] == true,
      avatarUrl: json['avatarUrl']?.toString(),
    );
  }
}

class SendCodeResult {
  const SendCodeResult({
    required this.resendAfterSeconds,
    this.demoCode,
    this.emailSent = false,
  });

  final int resendAfterSeconds;
  final String? demoCode;
  final bool emailSent;
}

class UsernameCheckResult {
  const UsernameCheckResult({
    required this.available,
    this.message,
    this.suggestion,
  });

  final bool available;
  final String? message;
  final String? suggestion;
}

class OAuthPending {
  const OAuthPending({
    this.userId,
    this.email,
    this.displayName,
    this.provider,
  });

  final int? userId;
  final String? email;
  final String? displayName;
  final String? provider;
}
