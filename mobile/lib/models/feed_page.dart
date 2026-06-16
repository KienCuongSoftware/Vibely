import 'feed_video.dart';

class FeedPage {
  const FeedPage({
    required this.items,
    required this.hasNext,
    required this.nextCursor,
  });

  final List<FeedVideo> items;
  final bool hasNext;
  final String? nextCursor;

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
    );
  }
}
