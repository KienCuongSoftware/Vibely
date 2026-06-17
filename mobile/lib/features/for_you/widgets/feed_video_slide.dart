import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../../config/api_config.dart';
import '../../../models/feed_video.dart';
import 'feed_action_rail.dart';
import 'feed_video_info.dart';

class FeedVideoSlide extends StatefulWidget {
  const FeedVideoSlide({
    super.key,
    required this.video,
    required this.isActive,
    this.bottomInset = 0,
    this.onRequireLogin,
  });

  final FeedVideo video;
  final bool isActive;
  final double bottomInset;
  final Future<bool> Function()? onRequireLogin;

  @override
  State<FeedVideoSlide> createState() => _FeedVideoSlideState();
}

class _FeedVideoSlideState extends State<FeedVideoSlide> {
  VideoPlayerController? _controller;
  bool _initialized = false;
  String? _error;
  bool _initInFlight = false;

  @override
  void initState() {
    super.initState();
    _syncPlayerLifecycle();
  }

  @override
  void didUpdateWidget(covariant FeedVideoSlide oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.video.publicId != widget.video.publicId) {
      _disposeController();
    }
    _syncPlayerLifecycle();
  }

  @override
  void dispose() {
    _disposeController();
    super.dispose();
  }

  void _disposeController() {
    final c = _controller;
    _controller = null;
    _initialized = false;
    _error = null;
    _initInFlight = false;
    if (c != null) {
      c.pause();
      c.dispose();
    }
  }

  void _syncPlayerLifecycle() {
    if (widget.isActive) {
      if (_controller == null && !_initInFlight) {
        _initPlayer();
      } else {
        _syncPlayback();
      }
      return;
    }

    // Off-screen: release decoder buffers (each ~30MB on Android).
    if (_controller != null) {
      _disposeController();
      if (mounted) setState(() {});
    }
  }

  Future<void> _initPlayer() async {
    final url = widget.video.playbackUrl;
    if (url == null || url.isEmpty) {
      if (!mounted) return;
      setState(() {
        _error = 'Video chưa sẵn sàng';
        _initialized = false;
      });
      return;
    }

    _initInFlight = true;
    final controller = VideoPlayerController.networkUrl(
      Uri.parse(url),
      httpHeaders: const {
        'User-Agent': 'VibelyMobile/1.0 (Flutter)',
        'Accept': '*/*',
      },
      videoPlayerOptions: VideoPlayerOptions(
        mixWithOthers: false,
        allowBackgroundPlayback: false,
      ),
    );
    _controller = controller;

    try {
      await controller.initialize();
      if (!mounted || !widget.isActive) {
        await controller.dispose();
        _controller = null;
        return;
      }
      await controller.setLooping(true);
      await controller.setVolume(1.0);
      if (!mounted || !widget.isActive) {
        await controller.dispose();
        _controller = null;
        return;
      }
      setState(() {
        _initialized = true;
        _error = null;
      });
      await controller.play();
    } catch (e) {
      await controller.dispose();
      _controller = null;
      if (!mounted) return;
      setState(() {
        _error = 'Không phát được video';
        _initialized = false;
      });
      if (kDebugMode) {
        debugPrint('Video init failed (${widget.video.publicId}): $e');
      }
    } finally {
      _initInFlight = false;
    }
  }

  void _syncPlayback() {
    final controller = _controller;
    if (controller == null || !_initialized) return;
    if (widget.isActive) {
      if (!controller.value.isPlaying) {
        controller.play();
      }
    } else {
      controller.pause();
    }
  }

  void _togglePlayPause() {
    final controller = _controller;
    if (controller == null || !_initialized) return;
    if (controller.value.isPlaying) {
      controller.pause();
    } else {
      controller.play();
    }
  }

  @override
  Widget build(BuildContext context) {
    final poster = ApiConfig.resolveAssetUrl(widget.video.thumbnailUrl);
    final controller = _controller;

    return GestureDetector(
      onTap: _togglePlayPause,
      behavior: HitTestBehavior.opaque,
      child: Stack(
        fit: StackFit.expand,
        children: [
          RepaintBoundary(child: _buildVideoLayer(poster)),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.72),
                    Colors.black.withValues(alpha: 0.2),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.45, 1.0],
                ),
              ),
              child: const SizedBox(height: 180),
            ),
          ),
          Positioned(
            right: 8,
            bottom: widget.bottomInset + 88,
            child: FeedActionRail(
              video: widget.video,
              onLikeTap: () => _guardAction(() => _showSoon(context, 'Thích')),
              onCommentTap: () => _guardAction(() => _showSoon(context, 'Bình luận')),
              onBookmarkTap: () => _guardAction(() => _showSoon(context, 'Lưu')),
              onShareTap: () => _guardAction(() => _showSoon(context, 'Chia sẻ')),
              onFollowTap: () => _guardAction(() => _showSoon(context, 'Theo dõi')),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: widget.bottomInset + 8,
            child: FeedVideoInfo(
              video: widget.video,
              bottomPadding: 8,
            ),
          ),
          if (_initialized && controller != null)
            ValueListenableBuilder<VideoPlayerValue>(
              valueListenable: controller,
              builder: (context, value, _) {
                if (value.isPlaying) return const SizedBox.shrink();
                return Center(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.35),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white30),
                    ),
                    child: const Icon(Icons.play_arrow, color: Colors.white, size: 42),
                  ),
                );
              },
            ),
          if (_error != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildVideoLayer(String poster) {
    final controller = _controller;
    if (!_initialized || controller == null) {
      return _buildPoster(poster);
    }

    // Android often reports 0×0 in value.size while ExoPlayer is already decoding.
    return ValueListenableBuilder<VideoPlayerValue>(
      valueListenable: controller,
      builder: (context, value, _) {
        final (width, height) = _resolveVideoDimensions(value.size);
        final fit = _fitForDimensions(width, height);
        return ColoredBox(
          color: Colors.black,
          child: Center(
            child: FittedBox(
              fit: fit,
              clipBehavior: fit == BoxFit.cover ? Clip.hardEdge : Clip.none,
              child: SizedBox(
                width: width,
                height: height,
                child: VideoPlayer(controller),
              ),
            ),
          ),
        );
      },
    );
  }

  (double, double) _resolveVideoDimensions(Size size) {
    if (size.width > 0 && size.height > 0) {
      return (size.width, size.height);
    }
    final w = widget.video.sourceWidthPx;
    final h = widget.video.sourceHeightPx;
    if (w != null && h != null && w > 0 && h > 0) {
      return (w.toDouble(), h.toDouble());
    }
    return (9, 16);
  }

  BoxFit _fitForDimensions(double width, double height) {
    if (width <= 0 || height <= 0) {
      return widget.video.prefersContainFit ? BoxFit.contain : BoxFit.cover;
    }
    return width >= height ? BoxFit.contain : BoxFit.cover;
  }

  BoxFit get _posterFit =>
      widget.video.prefersContainFit ? BoxFit.contain : BoxFit.cover;

  Widget _buildPoster(String poster) {
    return ColoredBox(
      color: Colors.black,
      child: CachedNetworkImage(
        imageUrl: poster,
        fit: _posterFit,
        width: double.infinity,
        height: double.infinity,
        memCacheWidth: 720,
        placeholder: (_, _) => Container(color: Colors.grey.shade900),
        errorWidget: (_, _, _) => Container(
          color: Colors.grey.shade900,
          child: const Center(
            child: Icon(Icons.videocam_off_outlined, color: Colors.white38, size: 48),
          ),
        ),
      ),
    );
  }

  Future<void> _guardAction(FutureOr<void> Function() action) async {
    final guard = widget.onRequireLogin;
    if (guard != null) {
      final ok = await guard();
      if (!ok) return;
    }
    await action();
  }

  void _showSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature — sắp có trên app'),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
