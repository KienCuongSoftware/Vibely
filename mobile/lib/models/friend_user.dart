class FriendUser {
  const FriendUser({
    required this.id,
    required this.username,
    required this.displayName,
    this.avatarUrl,
  });

  final int id;
  final String username;
  final String displayName;
  final String? avatarUrl;

  factory FriendUser.fromJson(Map<String, dynamic> json) {
    return FriendUser(
      id: _asInt(json['id']),
      username: json['username']?.toString() ?? '',
      displayName: json['displayName']?.toString() ?? '',
      avatarUrl: json['avatarUrl']?.toString(),
    );
  }

  static int _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
