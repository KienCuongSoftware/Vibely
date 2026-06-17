import '../models/search_models.dart';
import 'api_client.dart';

class SearchApi {
  SearchApi({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  Future<SearchSuggestPayload> suggest({
    String? query,
    String? token,
  }) async {
    final q = query?.trim() ?? '';
    final data = await _client.getJson(
      '/api/search/suggest',
      query: q.isEmpty ? null : {'q': q},
      bearerToken: token,
    );
    return SearchSuggestPayload.fromJson(data);
  }

  Future<List<SearchUserResult>> searchUsers(String query, {int limit = 20}) async {
    final q = query.trim();
    if (q.isEmpty) return const [];

    final data = await _client.getJson(
      '/api/search/users',
      query: {'q': q, 'limit': '$limit'},
    );

    final raw = data['_list'];
    if (raw is! List) return const [];

    return raw
        .whereType<Map<String, dynamic>>()
        .map(SearchUserResult.fromJson)
        .toList();
  }

  Future<List<SearchVideoResult>> searchVideos(String query, {int limit = 20}) async {
    final q = query.trim();
    if (q.isEmpty) return const [];

    final data = await _client.getJson(
      '/api/search/videos',
      query: {'q': q, 'limit': '$limit'},
    );

    final raw = data['_list'];
    if (raw is! List) return const [];

    return raw
        .whereType<Map<String, dynamic>>()
        .map(SearchVideoResult.fromJson)
        .toList();
  }
}
