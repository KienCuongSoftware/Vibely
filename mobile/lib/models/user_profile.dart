class UserProfile {
  const UserProfile({
    required this.id,
    required this.username,
    required this.displayName,
    required this.bio,
    required this.avatarUrl,
    required this.followingCount,
    required this.followerCount,
    required this.totalLikeCount,
    required this.totalViewCount,
    required this.followedByViewer,
    this.accountStatus = 'ACTIVE',
  });

  final int id;
  final String username;
  final String displayName;
  final String bio;
  final String avatarUrl;
  final int followingCount;
  final int followerCount;
  final int totalLikeCount;
  final int totalViewCount;
  final bool followedByViewer;
  final String accountStatus;

  bool get isBanned => accountStatus.toUpperCase() == 'BANNED';

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: _profileInt(json['id']),
      username: json['username']?.toString() ?? '',
      displayName: json['displayName']?.toString() ?? '',
      bio: json['bio']?.toString() ?? '',
      avatarUrl: json['avatarUrl']?.toString() ?? '',
      followingCount: _profileInt(json['followingCount']),
      followerCount: _profileInt(json['followerCount']),
      totalLikeCount: _profileInt(json['totalLikeCount']),
      totalViewCount: _profileInt(json['totalViewCount']),
      followedByViewer: json['followedByViewer'] == true,
      accountStatus: json['accountStatus']?.toString() ?? 'ACTIVE',
    );
  }
}

class MeUser {
  const MeUser({
    required this.id,
    required this.username,
    required this.displayName,
    required this.email,
    required this.bio,
    required this.avatarUrl,
    required this.needsOnboarding,
  });

  final int id;
  final String username;
  final String displayName;
  final String email;
  final String bio;
  final String avatarUrl;
  final bool needsOnboarding;

  factory MeUser.fromJson(Map<String, dynamic> json) {
    return MeUser(
      id: _profileInt(json['id']),
      username: json['username']?.toString() ?? '',
      displayName: json['displayName']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      bio: json['bio']?.toString() ?? '',
      avatarUrl: json['avatarUrl']?.toString() ?? '',
      needsOnboarding: json['needsOnboarding'] == true,
    );
  }
}

int _profileInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
