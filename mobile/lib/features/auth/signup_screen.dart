import 'dart:async';

import 'package:flutter/material.dart';

import '../../api/api_client.dart';
import '../../api/auth_api.dart';
import '../../auth/auth_controller.dart';
import '../../models/auth_session.dart';
import '../../theme/vibely_theme.dart';
import 'login_screen.dart';
import 'oauth_service.dart';
import 'widgets/auth_method_button.dart';
import 'widgets/auth_styles.dart';
import 'widgets/birth_date_fields.dart';
import 'widgets/otp_input_row.dart';

enum _SignupView { methods, credentials, verify, username, oauthBirth, oauthUsername }

class SignupScreen extends StatefulWidget {
  const SignupScreen({
    super.key,
    this.oauthPending,
    this.initialEmail,
  });

  final OAuthPending? oauthPending;
  final String? initialEmail;

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final AuthApi _authApi = AuthApi();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _usernameController = TextEditingController();

  _SignupView _view = _SignupView.methods;
  String? _month;
  String? _day;
  String? _year;
  String _otp = '';
  bool _otpVerified = false;
  bool _loading = false;
  bool _sendingCode = false;
  bool _obscurePassword = true;
  bool _usernameChecking = false;
  bool _usernameAvailable = false;
  String? _usernameMessage;
  String? _usernameSuggestion;
  String? _status;
  int _resendSeconds = 0;
  Timer? _resendTimer;

  @override
  void initState() {
    super.initState();
    if (widget.initialEmail != null) {
      _emailController.text = widget.initialEmail!;
    }
    if (widget.oauthPending != null) {
      _view = _SignupView.oauthBirth;
      if (widget.oauthPending!.email != null) {
        _emailController.text = widget.oauthPending!.email!;
      }
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _usernameController.dispose();
    _resendTimer?.cancel();
    super.dispose();
  }

  String get _email => _emailController.text.trim().toLowerCase();
  bool get _isEmailValid =>
      RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(_email);

  bool get _passwordValid {
    final p = _passwordController.text;
    if (p.length < 8 || p.length > 20) return false;
    return RegExp(r'[A-Za-z]').hasMatch(p) &&
        RegExp(r'\d').hasMatch(p) &&
        RegExp(r'[^A-Za-z0-9]').hasMatch(p);
  }

  String? get _birthDate {
    if (_month == null || _day == null || _year == null) return null;
    return '$_year-$_month-$_day';
  }

  String get _normalizedUsername =>
      _usernameController.text.trim().toLowerCase().replaceAll(RegExp(r'^@+'), '');

  void _startResendTimer(int seconds) {
    _resendTimer?.cancel();
    setState(() => _resendSeconds = seconds);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_resendSeconds <= 1) {
        timer.cancel();
        setState(() => _resendSeconds = 0);
      } else {
        setState(() => _resendSeconds -= 1);
      }
    });
  }

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
        setState(() {
          _loading = false;
          _view = _SignupView.oauthBirth;
          _status = 'Chọn ngày sinh để hoàn tất đăng ký.';
        });
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

  Future<void> _sendVerificationCode() async {
    if (!_isEmailValid || !_passwordValid || _birthDate == null) {
      setState(() => _status = 'Vui lòng nhập đầy đủ ngày sinh, email và mật khẩu hợp lệ');
      return;
    }
    if (_resendSeconds > 0 || _sendingCode) return;

    setState(() {
      _sendingCode = true;
      _status = null;
    });

    try {
      final result = await _authApi.sendCode(email: _email);
      if (!mounted) return;
      _startResendTimer(result.resendAfterSeconds);
      if (result.emailSent) {
        setState(() {
          _status =
              'Đã gửi mã 6 số tới $_email. Kiểm tra hộp thư đến và thư rác.';
          _view = _SignupView.verify;
        });
      } else if (result.demoCode != null) {
        setState(() {
          _status = 'Mã xác minh (dev): ${result.demoCode}';
          _view = _SignupView.verify;
        });
      } else {
        setState(() => _status = 'Không gửi được email xác minh. Thử lại sau.');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _status = _friendlyError(e));
    } finally {
      if (mounted) setState(() => _sendingCode = false);
    }
  }

  Future<void> _verifyAndContinue() async {
    if (_otp.length != 6) {
      setState(() => _status = 'Nhập mã 6 số');
      return;
    }

    setState(() {
      _loading = true;
      _status = 'Đang xác minh…';
    });

    try {
      await _authApi.verifyCode(email: _email, code: _otp);
      if (!mounted) return;
      setState(() {
        _otpVerified = true;
        _loading = false;
        _view = _SignupView.username;
        _status = 'Chọn Vibely ID để hoàn tất đăng ký.';
        _usernameController.text = _suggestUsername();
      });
      _checkUsername();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _status = _friendlyError(e);
      });
    }
  }

  String _suggestUsername() {
    final fromEmail = _email.split('@').first
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9._]'), '.')
        .replaceAll(RegExp(r'\.+'), '.')
        .replaceAll(RegExp(r'^\.+|\.+$'), '');
    if (fromEmail.length >= 4) return fromEmail.substring(0, fromEmail.length.clamp(0, 24));
    return 'vibely.user';
  }

  Future<void> _checkUsername() async {
    final username = _normalizedUsername;
    if (username.length < 3) {
      setState(() {
        _usernameAvailable = false;
        _usernameMessage = 'Vibely ID tối thiểu 3 ký tự';
      });
      return;
    }

    setState(() => _usernameChecking = true);
    try {
      final result = await _authApi.checkUsername(username);
      if (!mounted) return;
      setState(() {
        _usernameAvailable = result.available;
        _usernameMessage = result.message;
        _usernameSuggestion = result.suggestion;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _usernameAvailable = false;
        _usernameMessage = _friendlyError(e);
      });
    } finally {
      if (mounted) setState(() => _usernameChecking = false);
    }
  }

  Future<void> _register() async {
    if (!_otpVerified || !_usernameAvailable || _birthDate == null) {
      setState(() => _status = 'Hoàn tất xác minh email và chọn Vibely ID hợp lệ');
      return;
    }

    setState(() {
      _loading = true;
      _status = 'Đang đăng ký…';
    });

    try {
      await AuthController.instance.register(
        username: _normalizedUsername,
        email: _email,
        password: _passwordController.text,
        birthDate: _birthDate!,
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

  Future<void> _completeOAuthOnboarding() async {
    if (_birthDate == null) {
      setState(() => _status = 'Vui lòng chọn ngày sinh');
      return;
    }
    if (!_usernameAvailable || _normalizedUsername.isEmpty) {
      setState(() => _status = 'Vui lòng chọn Vibely ID hợp lệ');
      return;
    }

    setState(() {
      _loading = true;
      _status = 'Đang hoàn tất đăng ký…';
    });

    try {
      await AuthController.instance.completeOnboarding(
        username: _normalizedUsername,
        birthDate: _birthDate!,
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
    if (e is ApiException) return e.message;
    return e.toString().replaceFirst('Exception: ', '');
  }

  void _openLogin() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
    );
  }

  void _continueFromMethods() {
    if (!_isEmailValid) {
      setState(() => _status = 'Vui lòng nhập email hợp lệ');
      return;
    }
    setState(() {
      _view = _SignupView.credentials;
      _status = null;
    });
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
                child: switch (_view) {
                  _SignupView.methods => _buildMethodsView(),
                  _SignupView.credentials => _buildCredentialsView(),
                  _SignupView.verify => _buildVerifyView(),
                  _SignupView.username => _buildUsernameView(),
                  _SignupView.oauthBirth => _buildOAuthBirthView(),
                  _SignupView.oauthUsername => _buildOAuthUsernameView(),
                },
              ),
            ),
            if (_view == _SignupView.methods || _view == _SignupView.credentials)
              _buildFooter(),
          ],
        ),
      ),
    );
  }

  Widget _buildMethodsView() {
    final canContinue = _isEmailValid && !_loading;
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
                decoration: const BoxDecoration(
                  color: authFieldBg,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close, color: Colors.white, size: 22),
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Đăng ký Vibely',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 28),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            style: const TextStyle(color: Colors.white),
            decoration: authInputDecoration(hintText: 'Email'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: canContinue ? _continueFromMethods : null,
            style: authPrimaryButtonStyle(enabled: canContinue),
            child: const Text('Tiếp tục'),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              const Expanded(child: Divider(color: Color(0xFF3F3F46))),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  'hoặc',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.45), fontSize: 13),
                ),
              ),
              const Expanded(child: Divider(color: Color(0xFF3F3F46))),
            ],
          ),
          const SizedBox(height: 20),
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
            const SizedBox(height: 16),
            Text(_status!, textAlign: TextAlign.center, style: const TextStyle(color: authMuted, fontSize: 13)),
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
          _buildTopBar(onBack: () => setState(() => _view = _SignupView.methods)),
          const SizedBox(height: 8),
          const Text(
            'Đăng ký',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          const Text(
            'Vui lòng cho biết ngày sinh của bạn.',
            style: TextStyle(color: Colors.white, fontSize: 14),
          ),
          const SizedBox(height: 12),
          BirthDateFields(
            month: _month,
            day: _day,
            year: _year,
            onMonthChanged: (v) => setState(() => _month = v),
            onDayChanged: (v) => setState(() => _day = v),
            onYearChanged: (v) => setState(() => _year = v),
          ),
          const SizedBox(height: 8),
          const Text(
            'Ngày sinh của bạn sẽ không được hiển thị công khai.',
            style: TextStyle(color: authMuted, fontSize: 12),
          ),
          const SizedBox(height: 16),
          const Text('Email', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          TextField(
            controller: _emailController,
            readOnly: true,
            style: const TextStyle(color: Colors.white70),
            decoration: authInputDecoration(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            style: const TextStyle(color: Colors.white),
            decoration: authInputDecoration(hintText: 'Mật khẩu').copyWith(
              suffixIcon: IconButton(
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                icon: Icon(
                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                  color: Colors.white38,
                ),
              ),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 6),
          Text(
            '8–20 ký tự, gồm chữ, số và ký tự đặc biệt',
            style: TextStyle(
              color: _passwordValid ? const Color(0xFF4ADE80) : authMuted,
              fontSize: 12,
            ),
          ),
          if (_status != null) ...[
            const SizedBox(height: 12),
            Text(_status!, style: const TextStyle(color: Color(0xFFFF6B6B), fontSize: 13)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: (!_sendingCode && _passwordValid && _birthDate != null)
                ? _sendVerificationCode
                : null,
            style: authPrimaryButtonStyle(
              enabled: !_sendingCode && _passwordValid && _birthDate != null,
            ),
            child: Text(_sendingCode ? 'Đang gửi mã…' : 'Gửi mã xác minh'),
          ),
        ],
      ),
    );
  }

  Widget _buildVerifyView() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildTopBar(onBack: () => setState(() => _view = _SignupView.credentials)),
          const SizedBox(height: 8),
          const Text(
            'Xác minh email',
            style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          Text(
            'Nhập mã 6 số được gửi đến $_email',
            style: const TextStyle(color: authMuted, fontSize: 14, height: 1.4),
          ),
          const SizedBox(height: 28),
          OtpInputRow(
            onChanged: (code) => setState(() => _otp = code),
          ),
          const SizedBox(height: 16),
          if (_resendSeconds > 0)
            Text(
              'Gửi lại mã ${_resendSeconds}s',
              textAlign: TextAlign.center,
              style: const TextStyle(color: authMuted, fontSize: 13),
            )
          else
            TextButton(
              onPressed: _sendVerificationCode,
              child: const Text('Gửi lại mã'),
            ),
          if (_status != null) ...[
            const SizedBox(height: 12),
            Text(_status!, textAlign: TextAlign.center, style: const TextStyle(color: authMuted, fontSize: 13)),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: (_otp.length == 6 && !_loading) ? _verifyAndContinue : null,
            style: authPrimaryButtonStyle(enabled: _otp.length == 6 && !_loading),
            child: Text(_loading ? 'Đang xác minh…' : 'Tiếp tục'),
          ),
        ],
      ),
    );
  }

  Widget _buildUsernameView() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildTopBar(onBack: () => setState(() => _view = _SignupView.verify)),
          const SizedBox(height: 8),
          const Text(
            'Chọn Vibely ID',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _usernameController,
            autocorrect: false,
            style: const TextStyle(color: Colors.white),
            decoration: authInputDecoration(hintText: 'vibelyid').copyWith(
              prefixText: '@',
            ),
            onChanged: (_) {
              setState(() {});
              Future<void>.delayed(const Duration(milliseconds: 350), _checkUsername);
            },
          ),
          const SizedBox(height: 8),
          if (_usernameChecking)
            const Text('Đang kiểm tra…', style: TextStyle(color: authMuted, fontSize: 12))
          else if (_usernameMessage != null)
            Text(
              _usernameAvailable
                  ? 'Vibely ID khả dụng'
                  : '${_usernameMessage ?? ''}${_usernameSuggestion != null ? ' Gợi ý: @$_usernameSuggestion' : ''}',
              style: TextStyle(
                color: _usernameAvailable ? const Color(0xFF4ADE80) : const Color(0xFFFF6B6B),
                fontSize: 12,
              ),
            ),
          if (_status != null) ...[
            const SizedBox(height: 12),
            Text(_status!, style: const TextStyle(color: authMuted, fontSize: 13)),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: (_usernameAvailable && !_loading) ? _register : null,
            style: authPrimaryButtonStyle(enabled: _usernameAvailable && !_loading),
            child: Text(_loading ? 'Đang đăng ký…' : 'Đăng ký'),
          ),
        ],
      ),
    );
  }

  Widget _buildOAuthBirthView() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildTopBar(onBack: () => Navigator.of(context).pop(false)),
          const SizedBox(height: 8),
          const Text(
            'Hoàn tất đăng ký',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          const Text('Chọn ngày sinh của bạn.', style: TextStyle(color: Colors.white, fontSize: 14)),
          const SizedBox(height: 12),
          BirthDateFields(
            month: _month,
            day: _day,
            year: _year,
            onMonthChanged: (v) => setState(() => _month = v),
            onDayChanged: (v) => setState(() => _day = v),
            onYearChanged: (v) => setState(() => _year = v),
          ),
          if (_status != null) ...[
            const SizedBox(height: 16),
            Text(_status!, style: const TextStyle(color: authMuted, fontSize: 13)),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _birthDate != null
                ? () {
                    setState(() {
                      _view = _SignupView.oauthUsername;
                      _usernameController.text = _suggestUsername();
                    });
                    _checkUsername();
                  }
                : null,
            style: authPrimaryButtonStyle(enabled: _birthDate != null),
            child: const Text('Tiếp tục'),
          ),
        ],
      ),
    );
  }

  Widget _buildOAuthUsernameView() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildTopBar(onBack: () => setState(() => _view = _SignupView.oauthBirth)),
          const SizedBox(height: 8),
          const Text(
            'Chọn Vibely ID',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _usernameController,
            autocorrect: false,
            style: const TextStyle(color: Colors.white),
            decoration: authInputDecoration(hintText: 'vibelyid').copyWith(prefixText: '@'),
            onChanged: (_) {
              setState(() {});
              Future<void>.delayed(const Duration(milliseconds: 350), _checkUsername);
            },
          ),
          const SizedBox(height: 8),
          if (_usernameChecking)
            const Text('Đang kiểm tra…', style: TextStyle(color: authMuted, fontSize: 12))
          else if (_usernameMessage != null)
            Text(
              _usernameAvailable
                  ? 'Vibely ID khả dụng'
                  : '${_usernameMessage ?? ''}${_usernameSuggestion != null ? ' Gợi ý: @$_usernameSuggestion' : ''}',
              style: TextStyle(
                color: _usernameAvailable ? const Color(0xFF4ADE80) : const Color(0xFFFF6B6B),
                fontSize: 12,
              ),
            ),
          if (_status != null) ...[
            const SizedBox(height: 12),
            Text(_status!, style: const TextStyle(color: authMuted, fontSize: 13)),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: (_usernameAvailable && !_loading) ? _completeOAuthOnboarding : null,
            style: authPrimaryButtonStyle(enabled: _usernameAvailable && !_loading),
            child: Text(_loading ? 'Đang hoàn tất…' : 'Hoàn tất'),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar({required VoidCallback onBack}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        IconButton(
          onPressed: onBack,
          icon: Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(color: authFieldBg, shape: BoxShape.circle),
            child: const Icon(Icons.arrow_back, color: Colors.white, size: 22),
          ),
        ),
        IconButton(
          onPressed: () => Navigator.of(context).pop(false),
          icon: Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(color: authFieldBg, shape: BoxShape.circle),
            child: const Icon(Icons.close, color: Colors.white, size: 22),
          ),
        ),
      ],
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
        onTap: _openLogin,
        child: Text.rich(
          TextSpan(
            text: 'Bạn đã có tài khoản? ',
            style: const TextStyle(color: authMuted, fontSize: 14),
            children: const [
              TextSpan(
                text: 'Đăng nhập',
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
