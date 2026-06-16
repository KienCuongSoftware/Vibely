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
    final uri = Uri.parse('${ApiConfig.baseUrl}$path').replace(
      queryParameters: query?.isNotEmpty == true ? query : null,
    );

    final headers = <String, String>{
      'Accept': 'application/json',
      'Accept-Encoding': 'identity',
      'Connection': 'keep-alive',
      'User-Agent': 'VibelyMobile/1.0 (Flutter)',
    };
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }

    Object? lastError;
    for (var attempt = 1; attempt <= _maxAttempts; attempt++) {
      try {
        final response = await _http
            .get(uri, headers: headers)
            .timeout(_timeout, onTimeout: () {
          throw ApiException(
            'Server phản hồi quá chậm. Thử lại sau vài giây.',
          );
        });

        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw ApiException(
            'Yêu cầu thất bại (${response.statusCode})',
            statusCode: response.statusCode,
          );
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
          if (data is Map<String, dynamic>) return data;
          throw ApiException('Phản hồi API thiếu dữ liệu');
        }

        return decoded;
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

  void close() => _http.close();
}
