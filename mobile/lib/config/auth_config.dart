import '../auth/auth_controller.dart';

/// Bearer token for authenticated API calls.
class AuthConfig {
  static String? get bearerToken => AuthController.instance.token;
}
