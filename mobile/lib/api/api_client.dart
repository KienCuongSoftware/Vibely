import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiPostEnvelope {
  const ApiPostEnvelope({required this.data, this.accessToken});

  final Map<String, dynamic> data;
  final String? accessToken;
}

class ApiClient {
  ApiClient({http.Client? httpClient})
      : _http = httpClient ?? http.Client();

  final http.Client _http;

  static const Duration _timeout = Duration(seconds: 90);
  static const int _maxAttempts = 3;

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? query,
    String? bearerToken,
  }) async {
    final envelope = await _requestJson(
      method: 'GET',
      path: path,
      query: query,
      bearerToken: bearerToken,
    );
    return envelope.data;
  }

  Future<ApiPostEnvelope> postJson(
    String path, {
    Map<String, dynamic>? body,
    String? bearerToken,
  }) async {
    return _requestJson(
      method: 'POST',
      path: path,
      body: body,
      bearerToken: bearerToken,
    );
  }

  Future<ApiPostEnvelope> _requestJson({
    required String method,
    required String path,
    Map<String, String>? query,
    Map<String, dynamic>? body,
    String? bearerToken,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path').replace(
      queryParameters: query?.isNotEmpty == true ? query : null,
    );

    final headers = <String, String>{
      'Accept': 'application/json',
      'Accept-Encoding': 'identity',
      'Connection': 'keep-alive',
      'User-Agent': 'VibelyMobile/1.0 (Flutter)',
      'X-Vibely-Client': 'mobile',
    };
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }
    if (method == 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    Object? lastError;
    for (var attempt = 1; attempt <= _maxAttempts; attempt++) {
      try {
        final response = await _send(
          method: method,
          uri: uri,
          headers: headers,
          body: body,
        );

        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw _errorFromResponse(response);
        }

        final decoded = jsonDecode(response.body);
        if (decoded is! Map<String, dynamic>) {
          throw ApiException('Phản hồi API không hợp lệ');
        }

        if (decoded.containsKey('success')) {
          if (decoded['success'] != true) {
            final err = decoded['error'];
            final msg = err is Map ? err['message']?.toString() : null;
            throw ApiException(msg ?? 'Yêu cầu thất bại');
          }
          final data = decoded['data'];
          if (data == null) {
            return ApiPostEnvelope(
              data: const {},
              accessToken: _parseAccessCookie(response),
            );
          }
          if (data is Map<String, dynamic>) {
            return ApiPostEnvelope(
              data: data,
              accessToken: _resolveAccessToken(data, response),
            );
          }
          if (data is List) {
            return ApiPostEnvelope(
              data: {'_list': data},
              accessToken: _parseAccessCookie(response),
            );
          }
          throw ApiException('Phản hồi API không hợp lệ');
        }

        return ApiPostEnvelope(
          data: decoded,
          accessToken: _parseAccessCookie(response),
        );
      } on ApiException {
        rethrow;
      } on SocketException catch (e) {
        lastError = e;
      } on http.ClientException catch (e) {
        lastError = e;
      } on TimeoutException catch (e) {
        lastError = e;
      } on FormatException catch (e) {
        lastError = e;
      }

      if (attempt < _maxAttempts) {
        await Future<void>.delayed(Duration(milliseconds: 800 * attempt));
      }
    }

    throw ApiException(
      'Không kết nối được tới ${ApiConfig.baseUrl}. '
      'Kiểm tra mạng emulator hoặc thử lại.\n'
      '(${lastError ?? 'unknown'})',
    );
  }

  Future<http.Response> _send({
    required String method,
    required Uri uri,
    required Map<String, String> headers,
    Map<String, dynamic>? body,
  }) {
    final request = method == 'POST'
        ? _http.post(
            uri,
            headers: headers,
            body: body == null ? null : jsonEncode(body),
          )
        : _http.get(uri, headers: headers);

    return request.timeout(_timeout, onTimeout: () {
      throw ApiException('Server phản hồi quá chậm. Thử lại sau vài giây.');
    });
  }

  ApiException _errorFromResponse(http.Response response) {
    if (response.statusCode == 428) {
      return ApiException(
        'Cần xác minh bảo mật. Tạm thời hãy đăng nhập trên trình duyệt tại ${ApiConfig.baseUrl}',
        statusCode: 428,
      );
    }
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        final err = decoded['error'];
        final msg = err is Map ? err['message']?.toString() : null;
        if (msg != null && msg.isNotEmpty) {
          return ApiException(msg, statusCode: response.statusCode);
        }
      }
    } catch (_) {}
    if (response.statusCode >= 500) {
      return ApiException(
        'Máy chủ đang gặp sự cố. Thử lại sau hoặc đăng nhập trên ${ApiConfig.baseUrl}',
        statusCode: response.statusCode,
      );
    }
    return ApiException(
      'Yêu cầu thất bại (${response.statusCode})',
      statusCode: response.statusCode,
    );
  }

  String? _resolveAccessToken(
    Map<String, dynamic> data,
    http.Response response,
  ) {
    final fromBody = data['accessToken']?.toString();
    if (fromBody != null && fromBody.isNotEmpty) {
      return fromBody;
    }
    return _parseAccessCookie(response);
  }

  String? _parseAccessCookie(http.Response response) {
    final raw = response.headers['set-cookie'];
    if (raw == null || raw.isEmpty) return null;

    final candidates = <String>[raw];
    for (final part in raw.split(RegExp(r', (?=[^;]+=)'))) {
      if (part != raw) candidates.add(part);
    }

    for (final cookie in candidates) {
      final trimmed = cookie.trim();
      if (!trimmed.startsWith('vibely_at=')) continue;
      final token = trimmed.split(';').first.substring('vibely_at='.length);
      if (token.isNotEmpty) return token;
    }
    return null;
  }

  void close() => _http.close();
}
