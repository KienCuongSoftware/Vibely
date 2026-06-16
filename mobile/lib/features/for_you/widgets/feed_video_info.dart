import 'package:flutter/material.dart';

import '../../../models/feed_video.dart';

class FeedVideoInfo extends StatelessWidget {
  const FeedVideoInfo({
    super.key,
    required this.video,
    this.bottomPadding = 12,
  });

  final FeedVideo video;
  final double bottomPadding;

  @override
  Widget build(BuildContext context) {
    final username = video.authorUsername.trim().replaceAll('@', '');
    final caption = video.description.trim();

    return Padding(
      padding: EdgeInsets.fromLTRB(12, 0, 72, bottomPadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Flexible(
                child: Text(
                  '@$username',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    shadows: [Shadow(color: Colors.black87, blurRadius: 6)],
                  ),
                ),
              ),
            ],
          ),
          if (caption.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              caption,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.95),
                fontSize: 14,
                height: 1.25,
                shadows: const [Shadow(color: Colors.black87, blurRadius: 6)],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
