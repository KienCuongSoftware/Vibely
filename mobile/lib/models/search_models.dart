class SearchTrendItem {
  const SearchTrendItem({required this.keyword});

  final String keyword;

  factory SearchTrendItem.fromJson(Map<String, dynamic> json) {
    return SearchTrendItem(keyword: json['keyword']?.toString() ?? '');
  }
}

class SearchUserResult {
  const SearchUserResult({
    required this.id,
    required this.username,
    required this.displayName,
    this.avatarUrl,
  });

  final int? id;
  final String username;
  final String displayName;
  final String? avatarUrl;

  factory SearchUserResult.fromJson(Map<String, dynamic> json) {
    return SearchUserResult(
      id: json['id'] is num ? (json['id'] as num).toInt() : int.tryParse('${json['id']}'),
      username: json['username']?.toString() ?? '',
      displayName: json['displayName']?.toString() ?? '',
      avatarUrl: json['avatarUrl']?.toString(),
    );
  }
}

class SearchVideoResult {
  const SearchVideoResult({
    required this.publicId,
    required this.title,
    required this.description,
    this.thumbnailUrl,
    this.authorUsername,
    this.authorDisplayName,
    this.viewCount = 0,
    this.likeCount = 0,
  });

  final String publicId;
  final String title;
  final String description;
  final String? thumbnailUrl;
  final String? authorUsername;
  final String? authorDisplayName;
  final int viewCount;
  final int likeCount;

  String get caption {
    final desc = description.trim();
    if (desc.isNotEmpty) return desc;
    return title.trim();
  }

  factory SearchVideoResult.fromJson(Map<String, dynamic> json) {
    return SearchVideoResult(
      publicId: json['publicId']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      authorUsername: json['authorUsername']?.toString(),
      authorDisplayName: json['authorDisplayName']?.toString(),
      viewCount: _asInt(json['viewCount']),
      likeCount: _asInt(json['likeCount']),
    );
  }

  static int _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}

class SearchSuggestPayload {
  const SearchSuggestPayload({
    this.trending = const [],
    this.users = const [],
    this.videos = const [],
  });

  final List<SearchTrendItem> trending;
  final List<SearchUserResult> users;
  final List<SearchVideoResult> videos;

  factory SearchSuggestPayload.fromJson(Map<String, dynamic> json) {
    return SearchSuggestPayload(
      trending: _mapList(json['trending'], SearchTrendItem.fromJson),
      users: _mapList(json['users'], SearchUserResult.fromJson),
      videos: _mapList(json['videos'], SearchVideoResult.fromJson),
    );
  }

  static List<T> _mapList<T>(
    Object? raw,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    if (raw is! List) return const [];
    return raw.whereType<Map<String, dynamic>>().map(fromJson).toList();
  }
}
