import '../models/feed_page.dart';
import '../models/user_profile.dart';
import 'api_client.dart';

class ProfileApi {
  ProfileApi({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  Future<MeUser?> me({required String token}) async {
    final data = await _client.getJson('/api/auth/me', bearerToken: token);
    if (data.isEmpty) return null;
    return MeUser.fromJson(data);
  }

  Future<UserProfile> getPublicProfile({
    required String username,
    String? token,
  }) async {
    final normalized = username.trim().replaceAll('@', '');
    final data = await _client.getJson(
      '/api/users/$normalized',
      bearerToken: token,
    );
    return UserProfile.fromJson(data);
  }

  Future<FeedPage> getMyVideos({
    required String token,
    int page = 0,
    int size = 24,
  }) async {
    final data = await _client.getJson(
      '/api/users/me/videos',
      query: {'page': '$page', 'size': '$size'},
      bearerToken: token,
    );
    return FeedPage.fromJson(data);
  }

  Future<FeedPage> getVideosByUsername({
    required String username,
    int page = 0,
    int size = 24,
    String? token,
  }) async {
    final normalized = username.trim().replaceAll('@', '');
    final data = await _client.getJson(
      '/api/users/$normalized/videos',
      query: {'page': '$page', 'size': '$size'},
      bearerToken: token,
    );
    return FeedPage.fromJson(data);
  }
}
