import 'package:flutter/material.dart';

import '../../../theme/vibely_theme.dart';

class FeedTopBar extends StatelessWidget {
  const FeedTopBar({
    super.key,
    this.activeTab = FeedTopTab.forYou,
    this.onTabChanged,
    this.onSearchTap,
    this.onMenuTap,
  });

  final FeedTopTab activeTab;
  final ValueChanged<FeedTopTab>? onTabChanged;
  final VoidCallback? onSearchTap;
  final VoidCallback? onMenuTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: kFeedTopBarHeight,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(
          children: [
            IconButton(
              onPressed: onMenuTap,
              icon: const Icon(Icons.menu, color: Colors.white, size: 26),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
            ),
            Expanded(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _TabButton(
                    label: 'Đã follow',
                    selected: activeTab == FeedTopTab.following,
                    onTap: () => onTabChanged?.call(FeedTopTab.following),
                  ),
                  const SizedBox(width: 20),
                  _TabButton(
                    label: 'Đề xuất',
                    selected: activeTab == FeedTopTab.forYou,
                    onTap: () => onTabChanged?.call(FeedTopTab.forYou),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: onSearchTap,
              icon: const Icon(Icons.search, color: Colors.white, size: 24),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
            ),
          ],
        ),
      ),
    );
  }
}

enum FeedTopTab { following, forYou }

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
                color: selected ? Colors.white : Colors.white.withValues(alpha: 0.55),
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
