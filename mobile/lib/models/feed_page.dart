import 'feed_video.dart';

class FeedPage {
  const FeedPage({
    required this.items,
    required this.hasNext,
    required this.nextCursor,
    this.page = 0,
  });

  final List<FeedVideo> items;
  final bool hasNext;
  final String? nextCursor;
  final int page;

  factory FeedPage.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    final list = rawItems is List
        ? rawItems
            .whereType<Map<String, dynamic>>()
            .map(FeedVideo.fromJson)
            .toList()
        : <FeedVideo>[];

    return FeedPage(
      items: list,
      hasNext: json['hasNext'] == true,
      nextCursor: json['nextCursor']?.toString(),
      page: json['page'] is num ? (json['page'] as num).toInt() : 0,
    );
  }
}
