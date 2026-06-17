import 'package:flutter/foundation.dart';

/// Pauses feed video/audio while login, other routes, or OAuth activities are open.
class FeedPlaybackGate extends ChangeNotifier {
  FeedPlaybackGate._();

  static final FeedPlaybackGate instance = FeedPlaybackGate._();

  int _pauseDepth = 0;
  bool _appInBackground = false;

  bool get isPaused => _pauseDepth > 0 || _appInBackground;

  void setAppInBackground(bool value) {
    if (_appInBackground == value) return;
    _appInBackground = value;
    notifyListeners();
  }

  void pause() {
    _pauseDepth++;
    notifyListeners();
  }

  void resume() {
    if (_pauseDepth <= 0) return;
    _pauseDepth--;
    notifyListeners();
  }

  Future<T?> runWhilePaused<T>(Future<T?> Function() action) async {
    pause();
    try {
      return await action();
    } finally {
      resume();
    }
  }
}
