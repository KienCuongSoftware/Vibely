import '../models/auth_session.dart';
import 'api_client.dart';

class AuthApi {
  AuthApi({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    return _sessionFromEnvelope(
      await _client.postJson(
        '/api/auth/login',
        body: {
          'email': email.trim(),
          'password': password,
        },
      ),
    );
  }

  Future<AuthSession> register({
    required String username,
    required String email,
    required String password,
    required String birthDate,
    String? displayName,
    String? bio,
  }) async {
    return _sessionFromEnvelope(
      await _client.postJson(
        '/api/auth/register',
        body: {
          'username': username.trim(),
          'email': email.trim().toLowerCase(),
          'password': password,
          'birthDate': birthDate,
          if (displayName != null && displayName.isNotEmpty)
            'displayName': displayName,
          'bio': bio ?? '',
        },
      ),
    );
  }

  Future<SendCodeResult> sendCode({
    required String email,
    String purpose = 'REGISTER',
  }) async {
    final envelope = await _client.postJson(
      '/api/auth/send-code',
      body: {
        'email': email.trim().toLowerCase(),
        'purpose': purpose,
        'challengePassed': true,
      },
    );
    final data = envelope.data;
    return SendCodeResult(
      resendAfterSeconds: _asInt(data['resendAfterSeconds'], fallback: 60),
      demoCode: data['demoCode']?.toString(),
      emailSent: data['emailSent'] == true,
    );
  }

  Future<void> verifyCode({
    required String email,
    required String code,
    String purpose = 'REGISTER',
  }) async {
    final envelope = await _client.postJson(
      '/api/auth/verify-code',
      body: {
        'email': email.trim().toLowerCase(),
        'code': code.trim(),
        'purpose': purpose,
      },
    );
    if (envelope.data['verified'] != true) {
      throw ApiException('Mã xác minh không hợp lệ');
    }
  }

  Future<UsernameCheckResult> checkUsername(String username) async {
    final data = await _client.getJson(
      '/api/users/check-username',
      query: {'username': username.trim().toLowerCase()},
    );
    return UsernameCheckResult(
      available: data['available'] == true,
      message: data['message']?.toString(),
      suggestion: data['suggestion']?.toString(),
    );
  }

  Future<AuthSession> exchangeOAuthCode(String code) async {
    return _sessionFromEnvelope(
      await _client.postJson(
        '/api/auth/oauth/exchange',
        body: {'code': code.trim()},
      ),
    );
  }

  Future<AuthSession> oauthNative({
    required String provider,
    String? idToken,
    String? accessToken,
  }) async {
    return _sessionFromEnvelope(
      await _client.postJson(
        '/api/auth/oauth/native',
        body: {
          'provider': provider.trim().toLowerCase(),
          if (idToken != null && idToken.isNotEmpty) 'idToken': idToken,
          if (accessToken != null && accessToken.isNotEmpty)
            'accessToken': accessToken,
        },
      ),
    );
  }

  Future<AuthSession> completeOnboarding({
    required String username,
    required String birthDate,
    required String bearerToken,
  }) async {
    return _sessionFromEnvelope(
      await _client.postJson(
        '/api/auth/complete-onboarding',
        body: {
          'username': username.trim().toLowerCase(),
          'birthDate': birthDate,
        },
        bearerToken: bearerToken,
      ),
    );
  }

  Future<void> logout({String? bearerToken}) async {
    try {
      await _client.postJson('/api/auth/logout', bearerToken: bearerToken);
    } catch (_) {}
  }

  AuthSession _sessionFromEnvelope(ApiPostEnvelope envelope) {
    final session = AuthSession.fromJson(envelope.data);
    final token = envelope.accessToken ?? session.accessToken;
    if (token == null || token.isEmpty) {
      throw ApiException(
        'Không nhận được access token từ máy chủ. '
        'Kiểm tra backend đã deploy bản mới và header X-Vibely-Client: mobile.',
      );
    }
    return AuthSession(
      userId: session.userId,
      username: session.username,
      displayName: session.displayName,
      email: session.email,
      accessToken: token,
      needsOnboarding: session.needsOnboarding,
      avatarUrl: session.avatarUrl,
    );
  }

  int _asInt(Object? value, {required int fallback}) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }
}
