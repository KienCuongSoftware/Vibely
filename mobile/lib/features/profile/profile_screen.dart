import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../api/api_client.dart';
import '../../api/profile_api.dart';
import '../../auth/auth_controller.dart';
import '../../config/api_config.dart';
import '../../config/auth_config.dart';
import '../../models/feed_video.dart';
import '../../models/user_profile.dart';
import '../../theme/vibely_theme.dart';
import '../../utils/format_count.dart';
import '../../utils/require_login.dart';
import '../for_you/widgets/feed_bottom_nav.dart';

/// Profile page — same API as web `ProfilePage` (`/api/auth/me`, `/api/users/:username`, videos).
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, this.username});

  /// When null, loads the signed-in user's profile.
  final String? username;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ProfileApi _profileApi = ProfileApi();

  UserProfile? _profile;
  List<FeedVideo> _videos = [];
  bool _loading = true;
  String? _error;
  bool _isOwnProfile = true;

  String? get _token => AuthConfig.bearerToken;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _handleInvalidSession() async {
    await AuthController.instance.clearSession();
    if (!mounted) return;
    setState(() {
      _loading = false;
      _error = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    });
  }

  Future<void> _load() async {
    final token = _token;
    if (token == null || token.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'Đăng nhập để xem hồ sơ';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      String username = widget.username?.trim().replaceAll('@', '') ?? '';
      if (username.isEmpty) {
        final me = await _profileApi.me(token: token);
        username = me?.username.trim() ?? '';
        if (username.isEmpty) {
        await _handleInvalidSession();
        return;
      }
      }

      final meAgain = await _profileApi.me(token: token);
      final ownUsername = meAgain?.username.trim().replaceAll('@', '') ?? '';
      final isOwn = ownUsername.isNotEmpty &&
          ownUsername.toLowerCase() == username.toLowerCase();

      final profile = await _profileApi.getPublicProfile(
        username: username,
        token: token,
      );

      final page = profile.isBanned
          ? null
          : isOwn
              ? await _profileApi.getMyVideos(token: token, size: 48)
              : await _profileApi.getVideosByUsername(
                  username: username,
                  token: token,
                  size: 48,
                );

      if (!mounted) return;
      setState(() {
        _profile = profile;
        _videos = page?.items ?? const [];
        _isOwnProfile = isOwn;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      if (e is ApiException && e.statusCode == 401) {
        await _handleInvalidSession();
        return;
      }
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.message : e.toString();
      });
    }
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A1A),
        title: const Text('Đăng xuất', style: TextStyle(color: Colors.white)),
        content: const Text(
          'Bạn có chắc muốn đăng xuất?',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text(
              'Đăng xuất',
              style: TextStyle(color: VibelyColors.tiktokRed),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await AuthController.instance.logout();
    if (!mounted) return;
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  void _onBottomNavTap(String id) {
    if (id == 'profile') return;
    if (id == 'home') {
      Navigator.of(context).popUntil((route) => route.isFirst);
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Mục "$id" — sắp có trên app'),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String? _resolveBio(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    if (RegExp(r'^(Facebook|Google) user:', caseSensitive: false).hasMatch(trimmed)) {
      return null;
    }
    return trimmed;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VibelyColors.black,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Expanded(child: _buildBody()),
            SafeArea(
              top: false,
              child: FeedBottomNav(
                activeId: 'profile',
                onItemTap: _onBottomNavTap,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: VibelyColors.tiktokRed),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white70),
              ),
              const SizedBox(height: 16),
              if (_token != null)
                FilledButton(
                  onPressed: _load,
                  style: FilledButton.styleFrom(
                    backgroundColor: VibelyColors.tiktokRed,
                  ),
                  child: const Text('Thử lại'),
                )
              else
                FilledButton(
                  onPressed: () async {
                    final ok = await requireLogin(context);
                    if (ok && mounted) _load();
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: VibelyColors.tiktokRed,
                  ),
                  child: const Text('Đăng nhập lại'),
                ),
            ],
          ),
        ),
      );
    }

    final profile = _profile;
    if (profile == null) {
      return const Center(
        child: Text(
          'Không tìm thấy hồ sơ',
          style: TextStyle(color: Colors.white70),
        ),
      );
    }

    final bio = _resolveBio(profile.bio);
    final avatarUrl = ApiConfig.resolveAssetUrl(profile.avatarUrl);

    return RefreshIndicator(
      color: VibelyColors.tiktokRed,
      backgroundColor: Colors.grey.shade900,
      onRefresh: _load,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (!_isOwnProfile)
                        IconButton(
                          onPressed: () => Navigator.of(context).maybePop(),
                          icon: const Icon(Icons.arrow_back, color: Colors.white),
                        ),
                      const Spacer(),
                      if (_isOwnProfile)
                        IconButton(
                          onPressed: _logout,
                          tooltip: 'Đăng xuất',
                          icon: const Icon(Icons.logout, color: Colors.white70),
                        ),
                    ],
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(
                        radius: 44,
                        backgroundColor: Colors.grey.shade800,
                        backgroundImage: CachedNetworkImageProvider(avatarUrl),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              profile.displayName.isNotEmpty
                                  ? profile.displayName
                                  : profile.username,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '@${profile.username}',
                              style: const TextStyle(
                                color: Colors.white54,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                _StatChip(
                                  value: formatCompactCount(profile.followingCount),
                                  label: 'Đang follow',
                                ),
                                const SizedBox(width: 16),
                                _StatChip(
                                  value: formatCompactCount(profile.followerCount),
                                  label: 'Follower',
                                ),
                                const SizedBox(width: 16),
                                _StatChip(
                                  value: formatCompactCount(profile.totalLikeCount),
                                  label: 'Thích',
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (bio != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      bio,
                      style: const TextStyle(color: Colors.white, fontSize: 14),
                    ),
                  ],
                  const SizedBox(height: 20),
                  const Divider(color: Colors.white12, height: 1),
                  const SizedBox(height: 8),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.grid_on, color: Colors.white, size: 20),
                      SizedBox(width: 6),
                      Text(
                        'Video',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
          if (_videos.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _profile?.isBanned == true
                            ? 'Tài khoản đã bị cấm'
                            : 'Chưa có video',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (_profile?.isBanned == true) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Tài khoản ${_profile!.username} không còn có sẵn nữa',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white54,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  mainAxisSpacing: 2,
                  crossAxisSpacing: 2,
                  childAspectRatio: 9 / 16,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) => _ProfileVideoTile(video: _videos[index]),
                  childCount: _videos.length,
                ),
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        Text(
          label,
          style: const TextStyle(color: Colors.white54, fontSize: 11),
        ),
      ],
    );
  }
}

class _ProfileVideoTile extends StatelessWidget {
  const _ProfileVideoTile({required this.video});

  final FeedVideo video;

  @override
  Widget build(BuildContext context) {
    final thumb = ApiConfig.resolveAssetUrl(video.thumbnailUrl);

    return Stack(
      fit: StackFit.expand,
      children: [
        CachedNetworkImage(
          imageUrl: thumb,
          fit: BoxFit.cover,
          placeholder: (_, _) => Container(color: Colors.grey.shade900),
          errorWidget: (_, _, _) => Container(
            color: Colors.grey.shade900,
            child: const Icon(Icons.videocam_off, color: Colors.white24),
          ),
        ),
        Positioned(
          left: 6,
          bottom: 6,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.play_arrow, color: Colors.white, size: 14),
              Text(
                formatCompactCount(video.likeCount),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  shadows: [Shadow(color: Colors.black54, blurRadius: 4)],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
