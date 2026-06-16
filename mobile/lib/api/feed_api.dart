import '../models/feed_page.dart';
import 'api_client.dart';

class FeedApi {
  FeedApi({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  Future<FeedPage> getForYouFeed({
    int size = 10,
    String? cursor,
    String? token,
  }) async {
    final query = <String, String>{
      'size': '$size',
    };
    if (cursor != null && cursor.isNotEmpty) {
      query['cursor'] = cursor;
    }

    final data = await _client.getJson(
      '/api/feed/for-you',
      query: query,
      bearerToken: token,
    );

    return FeedPage.fromJson(data);
  }
}
