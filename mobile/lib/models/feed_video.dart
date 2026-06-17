class FeedVideo {
  const FeedVideo({
    required this.publicId,
    this.authorId,
    required this.authorUsername,
    required this.authorDisplayName,
    required this.authorAvatarUrl,
    required this.description,
    required this.videoUrl,
    required this.thumbnailUrl,
    required this.masterPlaylistUrl,
    required this.audioUrl,
    required this.audioTitle,
    required this.likeCount,
    required this.commentCount,
    required this.bookmarkCount,
    required this.shareCount,
    required this.followedByViewer,
    this.sourceWidthPx,
    this.sourceHeightPx,
  });

  final String publicId;
  final int? authorId;
  final String authorUsername;
  final String authorDisplayName;
  final String? authorAvatarUrl;
  final String description;
  final String? videoUrl;
  final String? thumbnailUrl;
  final String? masterPlaylistUrl;
  final String? audioUrl;
  final String? audioTitle;
  final int likeCount;
  final int commentCount;
  final int bookmarkCount;
  final int shareCount;
  final bool followedByViewer;
  final int? sourceWidthPx;
  final int? sourceHeightPx;

  factory FeedVideo.fromJson(Map<String, dynamic> json) {
    return FeedVideo(
      publicId: json['publicId']?.toString() ?? '',
      authorId: _asOptionalInt(json['authorId']),
      authorUsername: json['authorUsername']?.toString() ?? 'user',
      authorDisplayName: json['authorDisplayName']?.toString() ?? '',
      authorAvatarUrl: json['authorAvatarUrl']?.toString(),
      description: json['description']?.toString() ?? json['title']?.toString() ?? '',
      videoUrl: json['videoUrl']?.toString(),
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      masterPlaylistUrl: json['masterPlaylistUrl']?.toString(),
      audioUrl: json['audioUrl']?.toString(),
      audioTitle: json['audioTitle']?.toString(),
      likeCount: _asInt(json['likeCount']),
      commentCount: _asInt(json['commentCount']),
      bookmarkCount: _asInt(json['bookmarkCount']),
      shareCount: _asInt(json['shareCount']),
      followedByViewer: json['followedByViewer'] == true,
      sourceWidthPx: _asOptionalInt(json['sourceWidthPx']),
      sourceHeightPx: _asOptionalInt(json['sourceHeightPx']),
    );
  }

  String get displayName {
    final name = authorDisplayName.trim();
    if (name.isNotEmpty) return name;
    final user = authorUsername.trim().replaceAll('@', '');
    return user.isNotEmpty ? user : 'user';
  }

  /// Native app: progressive MP4 is more reliable than HLS on Android emulator/devices.
  /// Web uses HLS first via [resolveFeedPlaybackUrl] in frontend.
  String? get playbackUrl {
    final direct = videoUrl?.trim() ?? '';
    if (direct.isNotEmpty) return direct;
    final master = masterPlaylistUrl?.trim() ?? '';
    if (master.contains('.m3u8')) return master;
    return null;
  }

  static int _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  static int? _asOptionalInt(Object? value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value.toString());
  }

  /// Landscape / square: show full frame (letterbox). Portrait: fill screen like TikTok.
  bool get prefersContainFit {
    final w = sourceWidthPx;
    final h = sourceHeightPx;
    if (w != null && h != null && w > 0 && h > 0) {
      return w >= h;
    }
    return false;
  }
}
