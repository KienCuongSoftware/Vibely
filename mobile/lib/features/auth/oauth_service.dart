import 'package:flutter/services.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../api/auth_api.dart';
import '../../config/oauth_config.dart';
import '../../models/auth_session.dart';

/// Native OAuth via Google Sign-In and Facebook SDK (in-app, no browser).
class OAuthService {
  OAuthService._();

  static final AuthApi _authApi = AuthApi();

  /// Debug keystore SHA-1 — add to Google Cloud Console (Android OAuth client).
  static const String debugSha1 =
      '85:31:41:AA:6B:06:47:9D:B0:BE:EA:4A:B5:8F:90:D7:ED:89:DC:60';

  /// Facebook key hash (base64 SHA-1) for the same debug keystore.
  static const String debugFacebookKeyHash = 'hTFBqmsGR52wvupKtY+Q1+2J3GA=';

  static const String androidPackage = 'com.example.mobile';

  static GoogleSignIn _googleSignIn() {
    final serverClientId = OAuthConfig.googleServerClientId.trim();
    if (serverClientId.isEmpty) {
      throw OAuthException(
        'Thiếu GOOGLE_SERVER_CLIENT_ID. Thêm --dart-define khi chạy app.',
      );
    }
    return GoogleSignIn(
      scopes: const ['email', 'profile'],
      serverClientId: serverClientId,
    );
  }

  static Future<AuthSession> signIn(String provider) async {
    switch (provider.toLowerCase()) {
      case 'google':
        return _signInGoogle();
      case 'facebook':
        return _signInFacebook();
      default:
        throw OAuthException('Nhà cung cấp không được hỗ trợ');
    }
  }

  static Future<AuthSession> _signInGoogle() async {
    final googleSignIn = _googleSignIn();

    try {
      final account = await googleSignIn.signIn();
      if (account == null) {
        throw OAuthException('Đăng nhập Google bị hủy');
      }

      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw OAuthException(_googleDeveloperErrorMessage());
      }

      return _authApi.oauthNative(provider: 'google', idToken: idToken);
    } on OAuthException {
      rethrow;
    } on PlatformException catch (e) {
      throw OAuthException(_googleErrorMessage(e));
    } catch (e) {
      throw OAuthException(_googleErrorMessage(e));
    }
  }

  static Future<AuthSession> _signInFacebook() async {
    final appId = OAuthConfig.facebookAppId.trim();
    if (appId.isEmpty) {
      throw OAuthException(
        'Thiếu FACEBOOK_APP_ID. Thêm --dart-define khi chạy app.',
      );
    }

    try {
      final result = await FacebookAuth.instance.login(
        permissions: const ['email', 'public_profile'],
      );

      switch (result.status) {
        case LoginStatus.success:
          final token = result.accessToken?.tokenString;
          if (token == null || token.isEmpty) {
            throw OAuthException('Không lấy được Facebook token');
          }
          return _authApi.oauthNative(provider: 'facebook', accessToken: token);
        case LoginStatus.cancelled:
          throw OAuthException('Đăng nhập Facebook bị hủy');
        case LoginStatus.failed:
          throw OAuthException(_facebookErrorMessage(result.message));
        case LoginStatus.operationInProgress:
          throw OAuthException('Đăng nhập Facebook đang chạy, vui lòng thử lại');
      }
    } on OAuthException {
      rethrow;
    } catch (e) {
      throw OAuthException(_facebookErrorMessage(e.toString()));
    }
  }

  static String _googleDeveloperErrorMessage() {
    return 'Google chưa cấu hình OAuth cho Android.\n\n'
        'Google Cloud Console → APIs & Services → Credentials → '
        'Create OAuth client ID → Android:\n'
        '• Package name: $androidPackage\n'
        '• SHA-1: $debugSha1\n\n'
        'Giữ Web client ID làm serverClientId (đã cấu hình trong app).';
  }

  static String _googleErrorMessage(Object e) {
    final text =
        e is PlatformException
            ? '${e.code} ${e.message ?? ''}'
            : e.toString();
    final lower = text.toLowerCase();

    if (lower.contains('apiexception: 10') ||
        lower.contains('developer_error') ||
        RegExp(r'\b10\b').hasMatch(text) && lower.contains('apiexception')) {
      return _googleDeveloperErrorMessage();
    }

    if (e is PlatformException) {
      final message = e.message?.trim();
      if (message != null && message.isNotEmpty) {
        return message;
      }
      return 'Đăng nhập Google thất bại (${e.code})';
    }

    return text.replaceFirst('Exception: ', '');
  }

  static String _facebookErrorMessage(String? raw) {
    final msg = raw?.trim() ?? '';
    final lower = msg.toLowerCase();

    if (lower.contains('key hash') || lower.contains('key hashes')) {
      return 'Facebook chưa có Key Hash cho Android.\n\n'
          'Meta Developer → App Vibely → Settings → Basic → Android:\n'
          '• Package: $androidPackage\n'
          '• Key hash: $debugFacebookKeyHash\n'
          '(Xem logcat tag VibelyOAuth khi chạy app để xác nhận hash)';
    }

    if (lower.contains('client token') ||
        lower.contains('invalid oauth access token') ||
        lower.contains('unconfigured')) {
      return 'Facebook Client Token chưa đúng.\n\n'
          'Meta Developer → Settings → Advanced → Client token\n'
          'Thêm vào file mobile/android/local.properties:\n'
          'facebook.client.token=YOUR_CLIENT_TOKEN';
    }

    return msg.isNotEmpty ? msg : 'Đăng nhập Facebook thất bại';
  }
}

class OAuthException implements Exception {
  OAuthException(this.message);

  final String message;

  @override
  String toString() => message;
}
