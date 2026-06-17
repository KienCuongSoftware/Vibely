import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/auth_api.dart';
import '../features/auth/oauth_service.dart';
import '../models/auth_session.dart';

const _tokenKey = 'vibely_access_token';

class AuthController extends ChangeNotifier {
  AuthController._();

  static final AuthController instance = AuthController._();

  final AuthApi _authApi = AuthApi();

  String? _token;
  bool _hydrated = false;

  String? get token => _token;
  bool get isLoggedIn => _token != null && _token!.isNotEmpty;
  bool get hydrated => _hydrated;

  Future<void> hydrate() async {
    if (_hydrated) return;

    const fromEnv = String.fromEnvironment('VIBELY_TOKEN');
    if (fromEnv.isNotEmpty) {
      _token = fromEnv;
      _hydrated = true;
      notifyListeners();
      return;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString(_tokenKey);
      _token = stored != null && stored.isNotEmpty ? stored : null;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Auth hydrate skipped: $e');
      }
      _token = null;
    }

    _hydrated = true;
    notifyListeners();
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    final session = await _authApi.login(email: email, password: password);
    await _applySession(session);
  }

  Future<AuthSession> register({
    required String username,
    required String email,
    required String password,
    required String birthDate,
  }) async {
    final session = await _authApi.register(
      username: username,
      email: email,
      password: password,
      birthDate: birthDate,
      displayName: username,
    );
    await _applySession(session);
    return session;
  }

  Future<AuthSession> exchangeOAuthCode(String code) async {
    final session = await _authApi.exchangeOAuthCode(code);
    await _applySession(session);
    return session;
  }

  Future<AuthSession> signInWithOAuth(String provider) async {
    final session = await OAuthService.signIn(provider);
    await _applySession(session);
    return session;
  }

  Future<AuthSession> completeOnboarding({
    required String username,
    required String birthDate,
  }) async {
    final bearer = _token;
    if (bearer == null || bearer.isEmpty) {
      throw Exception('Phiên đăng nhập đã hết hạn');
    }
    final session = await _authApi.completeOnboarding(
      username: username,
      birthDate: birthDate,
      bearerToken: bearer,
    );
    await _applySession(session);
    return session;
  }

  Future<void> logout() async {
    final bearer = _token;
    await _authApi.logout(bearerToken: bearer);
    await clearSession();
  }

  /// Clears local session without calling the logout API (e.g. expired/invalid token).
  Future<void> clearSession() async {
    _token = null;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_tokenKey);
    } catch (_) {}
  }

  Future<void> _applySession(AuthSession session) async {
    final accessToken = session.accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      throw Exception('Không nhận được phiên đăng nhập từ máy chủ');
    }
    await _persistToken(accessToken);
  }

  Future<void> _persistToken(String accessToken) async {
    _token = accessToken;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, accessToken);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Token not persisted (session still active): $e');
      }
    }
  }
}
