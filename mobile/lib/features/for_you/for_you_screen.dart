import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../api/feed_api.dart';
import '../../models/feed_video.dart';
import '../../theme/vibely_theme.dart';
import 'widgets/feed_bottom_nav.dart';
import 'widgets/feed_top_bar.dart';
import 'widgets/feed_video_slide.dart';

class ForYouScreen extends StatefulWidget {
  const ForYouScreen({super.key});

  @override
  State<ForYouScreen> createState() => _ForYouScreenState();
}

class _ForYouScreenState extends State<ForYouScreen> {
  final FeedApi _feedApi = FeedApi();
  final PageController _pageController = PageController();

  final List<FeedVideo> _videos = [];
  String? _nextCursor;
  bool _hasNext = true;
  bool _loading = false;
  String? _error;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
    _loadInitial();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onPageChanged(int index) {
    if (!mounted) return;
    setState(() => _currentIndex = index);
    if (index >= _videos.length - 3) {
      _loadMore();
    }
  }

  Future<void> _loadInitial() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final page = await _feedApi.getForYouFeed(size: 10);
      if (!mounted) return;
      setState(() {
        _videos
          ..clear()
          ..addAll(page.items);
        _nextCursor = page.nextCursor;
        _hasNext = page.hasNext;
        _loading = false;
        if (_videos.isEmpty) {
          _error = 'Chưa có video trong feed Đề xuất';
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loading || !_hasNext) return;
    setState(() => _loading = true);

    try {
      final page = await _feedApi.getForYouFeed(
        size: 10,
        cursor: _nextCursor,
      );
      if (!mounted) return;
      setState(() {
        _videos.addAll(page.items);
        _nextCursor = page.nextCursor;
        _hasNext = page.hasNext;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  void _onBottomNavTap(String id) {
    if (id == 'home') return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Mục "$id" — sắp có trên app'),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _onTopTabChanged(FeedTopTab tab) {
    if (tab == FeedTopTab.forYou) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đã follow — sắp có trên app'),
        duration: Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VibelyColors.black,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            FeedTopBar(
              activeTab: FeedTopTab.forYou,
              onTabChanged: _onTopTabChanged,
              onSearchTap: () => _onBottomNavTap('search'),
              onMenuTap: () => _onBottomNavTap('menu'),
            ),
            Expanded(child: _buildBody()),
            FeedBottomNav(
              activeId: 'home',
              onItemTap: _onBottomNavTap,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading && _videos.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: VibelyColors.tiktokRed),
            SizedBox(height: 16),
            Text(
              'Đang tải feed…',
              style: TextStyle(color: Colors.white70, fontSize: 14),
            ),
          ],
        ),
      );
    }

    if (_error != null && _videos.isEmpty) {
      final shortError = _error!.length > 180
          ? '${_error!.substring(0, 180)}…'
          : _error!;
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                shortError,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _loadInitial,
                style: FilledButton.styleFrom(
                  backgroundColor: VibelyColors.tiktokRed,
                ),
                child: const Text('Thử lại'),
              ),
            ],
          ),
        ),
      );
    }

    return PageView.builder(
      controller: _pageController,
      scrollDirection: Axis.vertical,
      allowImplicitScrolling: false,
      onPageChanged: _onPageChanged,
      itemCount: _videos.length,
      itemBuilder: (context, index) {
        final video = _videos[index];
        return FeedVideoSlide(
          key: ValueKey(video.publicId),
          video: video,
          isActive: index == _currentIndex,
          bottomInset: 8,
        );
      },
    );
  }
}
