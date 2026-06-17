import 'package:flutter/material.dart';

import '../../../theme/vibely_theme.dart';

/// TikTok-style top bar: LIVE | [centered tabs] | search
class FeedTopBar extends StatelessWidget {
  const FeedTopBar({
    super.key,
    this.activeTab = FeedTopTab.forYou,
    this.onTabChanged,
    this.onSearchTap,
    this.onLiveTap,
  });

  final FeedTopTab activeTab;
  final ValueChanged<FeedTopTab>? onTabChanged;
  final VoidCallback? onSearchTap;
  final VoidCallback? onLiveTap;

  static const _tabs = <({FeedTopTab id, String label})>[
    (id: FeedTopTab.friends, label: 'Bạn bè'),
    (id: FeedTopTab.following, label: 'Đã follow'),
    (id: FeedTopTab.forYou, label: 'Đề xuất'),
  ];

  @override
  Widget build(BuildContext context) {
    // Match web MobileFeedShell: LIVE/search pinned to sides, tabs centered on screen.
    return SizedBox(
      height: kFeedTopBarHeight,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned(
            left: 8,
            top: 0,
            bottom: 0,
            child: IconButton(
              onPressed: onLiveTap,
              icon: const _LiveIcon(),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              tooltip: 'Live',
            ),
          ),
          Positioned(
            right: 8,
            top: 0,
            bottom: 0,
            child: IconButton(
              onPressed: onSearchTap,
              icon: const Icon(Icons.search, color: Colors.white, size: 24),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              tooltip: 'Tìm kiếm',
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 56),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < _tabs.length; i++) ...[
                  if (i > 0) const SizedBox(width: 16),
                  _TabButton(
                    label: _tabs[i].label,
                    selected: activeTab == _tabs[i].id,
                    onTap: () => onTabChanged?.call(_tabs[i].id),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

enum FeedTopTab { friends, following, forYou }

class _LiveIcon extends StatelessWidget {
  const _LiveIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28,
      height: 20,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        border: Border.all(color: Colors.white, width: 1.5),
        borderRadius: BorderRadius.circular(4),
      ),
      child: const Text(
        'LIVE',
        style: TextStyle(
          color: Colors.white,
          fontSize: 8,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.2,
          height: 1,
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                color: selected
                    ? Colors.white
                    : Colors.white.withValues(alpha: 0.55),
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              height: 2,
              width: 28,
              decoration: BoxDecoration(
                color: selected ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(1),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
