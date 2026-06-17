import '../models/friend_user.dart';
import 'api_client.dart';

class FollowApi {
  FollowApi({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  Future<List<FriendUser>> getFriends({required String token}) async {
    final data = await _client.getJson(
      '/api/follows/friends',
      bearerToken: token,
    );

    final raw = data['_list'];
    if (raw is! List) return const [];

    return raw
        .whereType<Map<String, dynamic>>()
        .map(FriendUser.fromJson)
        .where((f) => f.id > 0)
        .toList();
  }
}
