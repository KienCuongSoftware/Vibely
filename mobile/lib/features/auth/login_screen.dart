import 'package:flutter/material.dart';

import '../../api/api_client.dart';
import '../../auth/auth_controller.dart';
import '../../models/auth_session.dart';
import '../../theme/vibely_theme.dart';
import 'oauth_service.dart';
import 'signup_screen.dart';
import 'widgets/auth_method_button.dart';
import 'widgets/auth_styles.dart';

enum _LoginView { methods, credentials }

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  _LoginView _view = _LoginView.methods;
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _loading = false;
  bool _obscurePassword = true;
  bool _saveLogin = true;
  String? _status;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  bool get _canSubmit =>
      _identifierController.text.trim().isNotEmpty &&
      _passwordController.text.isNotEmpty &&
      !_loading;

  Future<void> _startOAuth(String provider) async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _status = null;
    });

    try {
      final session = await AuthController.instance.signInWithOAuth(provider);
      if (!mounted) return;
      if (session.needsOnboarding) {
        await Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(
            builder: (_) => SignupScreen(
              oauthPending: OAuthPending(
                userId: session.userId,
                email: session.email,
                displayName: session.displayName,
                provider: provider,
              ),
            ),
          ),
        );
        return;
      }
      Navigator.of(context).pop(true);
    } on OAuthException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _status = e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _status = _friendlyError(e);
      });
    }
  }

  Future<void> _submitCredentials() async {
    if (!_canSubmit) return;
    final identifier = _identifierController.text.trim();
    if (!identifier.contains('@')) {
      setState(() => _status =
          'Hiện tại chỉ hỗ trợ đăng nhập bằng email. Vui lòng nhập email đã đăng ký.');
      return;
    }

    setState(() {
      _loading = true;
      _status = 'Đang đăng nhập…';
    });

    try {
      await AuthController.instance.login(
        email: identifier,
        password: _passwordController.text,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _status = _friendlyError(e);
      });
    }
  }

  String _friendlyError(Object e) {
    if (e is OAuthException) return e.message;
    if (e is ApiException) {
      if (e.statusCode != null && e.statusCode! >= 500) {
        return '${e.message}\n\n'
            'Máy chủ vibely.sbs đang lỗi khi xác minh OAuth. '
            'Kiểm tra biến môi trường FACEBOOK_CLIENT_SECRET / GOOGLE_CLIENT_SECRET '
            '(App Secret trên Meta/Google Cloud, không phải Client Token trên Android).';
      }
      return e.message;
    }
    return e.toString().replaceFirst('Exception: ', '');
  }

  void _openSignup() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => const SignupScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VibelyColors.black,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                child: _view == _LoginView.methods
                    ? _buildMethodsView()
                    : _buildCredentialsView(),
              ),
            ),
            _buildFooter(),
          ],
        ),
      ),
    );
  }

  Widget _buildMethodsView() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: IconButton(
              onPressed: () => Navigator.of(context).pop(false),
              icon: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: authFieldBg,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close, color: Colors.white, size: 22),
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Đăng nhập vào Vibely',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w700,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 28),
          AuthMethodButton(
            label: 'Sử dụng email/tên người dùng',
            icon: AuthSocialIcons.user(),
            onTap: () => setState(() {
              _view = _LoginView.credentials;
              _status = null;
            }),
          ),
          const SizedBox(height: 12),
          AuthMethodButton(
            label: 'Tiếp tục với Facebook',
            icon: AuthSocialIcons.facebook(),
            onTap: () => _startOAuth('facebook'),
          ),
          const SizedBox(height: 12),
          AuthMethodButton(
            label: 'Tiếp tục với Google',
            icon: AuthSocialIcons.google(),
            onTap: () => _startOAuth('google'),
          ),
          if (_status != null) ...[
            const SizedBox(height: 20),
            Text(
              _status!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: authMuted, fontSize: 13),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCredentialsView() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                onPressed: () => setState(() {
                  _view = _LoginView.methods;
                  _status = null;
                }),
                icon: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: authFieldBg,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.arrow_back, color: Colors.white, size: 22),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(false),
                icon: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: authFieldBg,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close, color: Colors.white, size: 22),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Đăng nhập',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Email/tên người dùng',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _identifierController,
            style: const TextStyle(color: Colors.white),
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            decoration: authInputDecoration(
              hintText: 'Email hoặc tên người dùng',
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            style: const TextStyle(color: Colors.white),
            decoration: authInputDecoration(hintText: 'Mật khẩu').copyWith(
              suffixIcon: IconButton(
                onPressed: () =>
                    setState(() => _obscurePassword = !_obscurePassword),
                icon: Icon(
                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                  color: Colors.white38,
                ),
              ),
            ),
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) => _submitCredentials(),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 28,
                height: 28,
                child: Checkbox(
                  value: _saveLogin,
                  onChanged: (v) => setState(() => _saveLogin = v ?? true),
                  activeColor: VibelyColors.tiktokRed,
                  side: const BorderSide(color: Colors.white38),
                ),
              ),
              const Expanded(
                child: Padding(
                  padding: EdgeInsets.only(top: 4),
                  child: Text(
                    'Lưu thông tin đăng nhập để tự động đăng nhập vào lần sau.',
                    style: TextStyle(color: authMuted, fontSize: 12, height: 1.35),
                  ),
                ),
              ),
            ],
          ),
          if (_status != null) ...[
            const SizedBox(height: 16),
            Text(
              _status!,
              style: const TextStyle(color: Color(0xFFFF6B6B), fontSize: 13),
            ),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _canSubmit ? _submitCredentials : null,
            style: authPrimaryButtonStyle(enabled: _canSubmit),
            child: Text(_loading ? 'Đang đăng nhập…' : 'Tiếp tục'),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFF27272A))),
      ),
      child: GestureDetector(
        onTap: _openSignup,
        child: Text.rich(
          TextSpan(
            text: 'Bạn không có tài khoản? ',
            style: const TextStyle(color: authMuted, fontSize: 14),
            children: const [
              TextSpan(
                text: 'Đăng ký',
                style: TextStyle(
                  color: VibelyColors.tiktokRed,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
