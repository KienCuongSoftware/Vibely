import 'package:flutter/material.dart';

import '../../../theme/vibely_theme.dart';

class FeedBottomNav extends StatelessWidget {
  const FeedBottomNav({
    super.key,
    this.activeId = 'home',
    this.onItemTap,
  });

  final String activeId;
  final ValueChanged<String>? onItemTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: kFeedBottomNavHeight,
      decoration: BoxDecoration(
        color: VibelyColors.black,
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
      ),
      child: Row(
        children: [
          _NavItem(
            id: 'home',
            activeId: activeId,
            icon: Icons.home_rounded,
            label: 'Trang chủ',
            onTap: onItemTap,
          ),
          _NavItem(
            id: 'explore',
            activeId: activeId,
            icon: Icons.explore_outlined,
            label: 'Khám phá',
            onTap: onItemTap,
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => onItemTap?.call('upload'),
              behavior: HitTestBehavior.opaque,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    height: 32,
                    width: 44,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: const SizedBox(
                            width: 44,
                            height: 32,
                            child: Row(
                              children: [
                                Expanded(
                                  child: ColoredBox(
                                    color: VibelyColors.cyanAccent,
                                  ),
                                ),
                                Expanded(
                                  child: ColoredBox(
                                    color: VibelyColors.magentaAccent,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        Container(
                          height: 26,
                          width: 28,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            '+',
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              height: 1,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          _NavItem(
            id: 'messages',
            activeId: activeId,
            icon: Icons.send_outlined,
            label: 'Hộp thư',
            onTap: onItemTap,
          ),
          _NavItem(
            id: 'profile',
            activeId: activeId,
            icon: Icons.person_outline,
            label: 'Hồ sơ',
            onTap: onItemTap,
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.id,
    required this.activeId,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final String id;
  final String activeId;
  final IconData icon;
  final String label;
  final ValueChanged<String>? onTap;

  @override
  Widget build(BuildContext context) {
    final active = activeId == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => onTap?.call(id),
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 24,
              color: active ? Colors.white : const Color(0xFF9CA3AF),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: active ? Colors.white : const Color(0xFF9CA3AF),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
