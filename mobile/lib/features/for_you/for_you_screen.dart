import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../api/api_client.dart';
import '../../api/feed_api.dart';
import '../../api/follow_api.dart';
import '../../auth/auth_controller.dart';
import '../../config/auth_config.dart';
import '../../models/feed_video.dart';
import '../../theme/vibely_theme.dart';
import '../../utils/require_login.dart';
import '../search/search_screen.dart';
import '../profile/profile_screen.dart';
import 'feed_playback_gate.dart';
import 'widgets/feed_bottom_nav.dart';
import 'widgets/feed_top_bar.dart';
import 'widgets/feed_video_slide.dart';

class ForYouScreen extends StatefulWidget {
  const ForYouScreen({super.key});

  @override
  State<ForYouScreen> createState() => _ForYouScreenState();
}

class _ForYouScreenState extends State<ForYouScreen> with WidgetsBindingObserver {
  final FeedApi _feedApi = FeedApi();
  final FollowApi _followApi = FollowApi();
  final PageController _pageController = PageController();
  final FeedPlaybackGate _playbackGate = FeedPlaybackGate.instance;

  final List<FeedVideo> _videos = [];
  FeedTopTab _activeTab = FeedTopTab.forYou;
  String? _nextCursor;
  int _followingPage = 0;
  Set<int> _friendIds = {};
  bool _hasNext = true;
  bool _loading = false;
  String? _error;
  int _currentIndex = 0;

  String? get _token => AuthConfig.bearerToken;
  bool get _isLoggedIn => AuthController.instance.isLoggedIn;

  bool get _feedPlaybackActive =>
      !_playbackGate.isPaused;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _playbackGate.addListener(_onPlaybackGateChanged);
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
    _loadInitial();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _playbackGate.removeListener(_onPlaybackGateChanged);
    _pageController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final inBackground = switch (state) {
      AppLifecycleState.resumed => false,
      AppLifecycleState.inactive ||
      AppLifecycleState.paused ||
      AppLifecycleState.detached ||
      AppLifecycleState.hidden => true,
    };
    _playbackGate.setAppInBackground(inBackground);
  }

  void _onPlaybackGateChanged() {
    if (mounted) setState(() {});
  }

  void _onPageChanged(int index) {
    if (!mounted) return;
    setState(() => _currentIndex = index);
    if (index >= _videos.length - 3) {
      _loadMore();
    }
  }

  String get _emptyMessage {
    switch (_activeTab) {
      case FeedTopTab.friends:
        return 'Chưa có video từ bạn bè';
      case FeedTopTab.following:
        return 'Chưa có video từ người bạn follow';
      case FeedTopTab.forYou:
        return 'Chưa có video trong feed Đề xuất';
    }
  }

  Future<void> _loadInitial() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
      _videos.clear();
      _nextCursor = null;
      _followingPage = 0;
      _hasNext = true;
      _currentIndex = 0;
    });

    try {
      switch (_activeTab) {
        case FeedTopTab.forYou:
          await _loadForYou(initial: true);
        case FeedTopTab.following:
          await _loadFollowing(initial: true);
        case FeedTopTab.friends:
          await _loadFriends(initial: true);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _friendlyError(e);
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loading || !_hasNext) return;
    setState(() => _loading = true);

    try {
      switch (_activeTab) {
        case FeedTopTab.forYou:
          await _loadForYou(initial: false);
        case FeedTopTab.following:
          await _loadFollowing(initial: false);
        case FeedTopTab.friends:
          await _loadFriends(initial: false);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _loadForYou({required bool initial}) async {
    final page = await _feedApi.getForYouFeed(
      size: 10,
      cursor: initial ? null : _nextCursor,
      token: _token,
    );
    if (!mounted) return;
    setState(() {
      if (initial) {
        _videos
          ..clear()
          ..addAll(page.items);
      } else {
        _videos.addAll(page.items);
      }
      _nextCursor = page.nextCursor;
      _hasNext = page.hasNext;
      _loading = false;
      if (_videos.isEmpty) _error = _emptyMessage;
    });
  }

  Future<void> _loadFollowing({required bool initial}) async {
    final token = _token;
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Đăng nhập để xem feed Đã follow';
      });
      return;
    }

    final page = await _feedApi.getFollowingFeed(
      page: initial ? 0 : _followingPage + 1,
      size: 10,
      token: token,
    );
    if (!mounted) return;
    setState(() {
      if (initial) _videos.clear();
      _videos.addAll(page.items);
      _followingPage = page.page;
      _hasNext = page.hasNext;
      _loading = false;
      if (_videos.isEmpty) _error = _emptyMessage;
    });
  }

  Future<void> _loadFriends({required bool initial}) async {
    if (!_isLoggedIn) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Đăng nhập để xem video từ bạn bè';
      });
      return;
    }

    final token = _token!;
    if (initial) {
      final friends = await _followApi.getFriends(token: token);
      _friendIds = friends.map((f) => f.id).where((id) => id > 0).toSet();
      _followingPage = 0;
      _videos.clear();
      _hasNext = true;

      if (_friendIds.isEmpty) {
        if (!mounted) return;
        setState(() {
          _loading = false;
          _error =
              'Chưa có bạn bè — follow nhau để xem video trong tab Bạn bè';
        });
        return;
      }
    }

    var added = 0;
    while (_hasNext && added < 10) {
      final page = await _feedApi.getFollowingFeed(
        page: initial && added == 0 ? 0 : _followingPage + 1,
        size: 20,
        token: token,
      );

      final filtered = page.items.where((video) {
        final id = video.authorId;
        return id != null && _friendIds.contains(id);
      }).toList();

      _videos.addAll(filtered);
      added += filtered.length;
      _followingPage = page.page;
      _hasNext = page.hasNext;

      if (!page.hasNext) break;
      if (!initial && added > 0) break;
    }

    if (!mounted) return;
    setState(() {
      _loading = false;
      if (_videos.isEmpty) {
        _error = _emptyMessage;
      }
    });
  }

  String _friendlyError(Object e) {
    if (e is ApiException) {
      if (e.statusCode == 401) {
        return 'Đăng nhập để xem nội dung này';
      }
      return e.message;
    }
    return e.toString();
  }

  void _onBottomNavTap(String id) {
    if (id == 'home') return;
    if (id == 'profile') {
      _guardNavigation(() async {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => const ProfileScreen()),
        );
      });
      return;
    }
    _guardNavigation(() {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Mục "$id" — sắp có trên app'),
          duration: const Duration(seconds: 1),
          behavior: SnackBarBehavior.floating,
        ),
      );
    });
  }

  Future<void> _guardNavigation(FutureOr<void> Function() action) async {
    await _playbackGate.runWhilePaused(() async {
      if (!await requireLogin(context)) return;
      await action();
    });
  }

  void _onTopTabChanged(FeedTopTab tab) {
    if (tab == _activeTab) return;
    if (tab != FeedTopTab.forYou) {
      requireLogin(context).then((ok) {
        if (!ok || !mounted) return;
        setState(() => _activeTab = tab);
        if (_pageController.hasClients) {
          _pageController.jumpToPage(0);
        }
        _loadInitial();
      });
      return;
    }
    setState(() => _activeTab = tab);
    if (_pageController.hasClients) {
      _pageController.jumpToPage(0);
    }
    _loadInitial();
  }

  void _openSearch() {
    _guardNavigation(() async {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const SearchScreen()),
      );
    });
  }

  void _onLiveTap() {
    _guardNavigation(() async {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Live — sắp có trên Vibely'),
          duration: Duration(seconds: 1),
          behavior: SnackBarBehavior.floating,
        ),
      );
    });
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
              activeTab: _activeTab,
              onTabChanged: _onTopTabChanged,
              onSearchTap: _openSearch,
              onLiveTap: _onLiveTap,
            ),
            Expanded(child: _buildBody()),
            SafeArea(
              top: false,
              child: FeedBottomNav(
                activeId: 'home',
                onItemTap: _onBottomNavTap,
              ),
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
      final shortError = _error!.length > 220
          ? '${_error!.substring(0, 220)}…'
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
              if (_activeTab == FeedTopTab.forYou ||
                  _token != null && _token!.isNotEmpty)
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

    if (_videos.isEmpty) {
      return Center(
        child: Text(
          _emptyMessage,
          style: const TextStyle(color: Colors.white70),
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
          isActive: index == _currentIndex && _feedPlaybackActive,
          bottomInset: 12,
          onRequireLogin: () => requireLogin(context),
        );
      },
    );
  }
}
