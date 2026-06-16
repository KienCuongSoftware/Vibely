import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../config/api_config.dart';
import '../../../models/feed_video.dart';
import '../../../theme/vibely_theme.dart';
import '../../../utils/format_count.dart';

class FeedActionRail extends StatelessWidget {
  const FeedActionRail({
    super.key,
    required this.video,
    this.onLikeTap,
    this.onCommentTap,
    this.onBookmarkTap,
    this.onShareTap,
    this.onFollowTap,
  });

  final FeedVideo video;
  final VoidCallback? onLikeTap;
  final VoidCallback? onCommentTap;
  final VoidCallback? onBookmarkTap;
  final VoidCallback? onShareTap;
  final VoidCallback? onFollowTap;

  @override
  Widget build(BuildContext context) {
    final avatarUrl = ApiConfig.resolveAssetUrl(video.authorAvatarUrl);

    return SizedBox(
      width: kActionRailWidth,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _AvatarFollowButton(
            imageUrl: avatarUrl,
            followed: video.followedByViewer,
            onFollowTap: onFollowTap,
          ),
          const SizedBox(height: 18),
          _ActionItem(
            icon: Icons.favorite,
            count: formatCompactCount(video.likeCount),
            onTap: onLikeTap,
          ),
          const SizedBox(height: 14),
          _ActionItem(
            icon: Icons.mode_comment_outlined,
            count: formatCompactCount(video.commentCount),
            onTap: onCommentTap,
          ),
          const SizedBox(height: 14),
          _ActionItem(
            icon: Icons.bookmark_border,
            count: formatCompactCount(video.bookmarkCount),
            onTap: onBookmarkTap,
          ),
          const SizedBox(height: 14),
          _ActionItem(
            icon: Icons.reply,
            count: formatCompactCount(video.shareCount),
            onTap: onShareTap,
            flipShareIcon: true,
          ),
          const SizedBox(height: 16),
          _MusicDisc(imageUrl: avatarUrl),
        ],
      ),
    );
  }
}

class _AvatarFollowButton extends StatelessWidget {
  const _AvatarFollowButton({
    required this.imageUrl,
    required this.followed,
    this.onFollowTap,
  });

  final String imageUrl;
  final bool followed;
  final VoidCallback? onFollowTap;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.bottomCenter,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 1.5),
          ),
          child: ClipOval(
            child: CachedNetworkImage(
              imageUrl: imageUrl,
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(color: Colors.grey.shade800),
              errorWidget: (_, __, ___) => Container(
                color: Colors.grey.shade800,
                child: const Icon(Icons.person, color: Colors.white54),
              ),
            ),
          ),
        ),
        if (!followed)
          Positioned(
            bottom: -8,
            child: GestureDetector(
              onTap: onFollowTap,
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: VibelyColors.tiktokRed,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.black, width: 2),
                ),
                child: const Icon(Icons.add, color: Colors.white, size: 14),
              ),
            ),
          ),
      ],
    );
  }
}

class _ActionItem extends StatelessWidget {
  const _ActionItem({
    required this.icon,
    required this.count,
    this.onTap,
    this.flipShareIcon = false,
  });

  final IconData icon;
  final String count;
  final VoidCallback? onTap;
  final bool flipShareIcon;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.25),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
            ),
            child: Transform(
              alignment: Alignment.center,
              transform: flipShareIcon
                  ? Matrix4.diagonal3Values(-1.0, 1.0, 1.0)
                  : Matrix4.identity(),
              child: Icon(icon, color: Colors.white, size: 26),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            count,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w500,
              shadows: [Shadow(color: Colors.black54, blurRadius: 4)],
            ),
          ),
        ],
      ),
    );
  }
}

class _MusicDisc extends StatefulWidget {
  const _MusicDisc({required this.imageUrl});

  final String imageUrl;

  @override
  State<_MusicDisc> createState() => _MusicDiscState();
}

class _MusicDiscState extends State<_MusicDisc> with SingleTickerProviderStateMixin {
  late final AnimationController _spin;

  @override
  void initState() {
    super.initState();
    _spin = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void dispose() {
    _spin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RotationTransition(
      turns: _spin,
      child: Container(
        width: 44,
        height: 44,
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withValues(alpha: 0.35), width: 2),
          color: Colors.black,
        ),
        child: ClipOval(
          child: CachedNetworkImage(
            imageUrl: widget.imageUrl,
            fit: BoxFit.cover,
          ),
        ),
      ),
    );
  }
}
