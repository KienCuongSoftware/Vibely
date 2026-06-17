import 'package:flutter/material.dart';

import '../auth/auth_controller.dart';
import '../features/auth/login_screen.dart';
import '../features/for_you/feed_playback_gate.dart';

/// Returns `true` when the user may continue (already signed in or just logged in).
Future<bool> requireLogin(BuildContext context) async {
  if (AuthController.instance.isLoggedIn) return true;

  final loggedIn = await FeedPlaybackGate.instance.runWhilePaused(
    () => Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(builder: (_) => const LoginScreen()),
    ),
  );
  return loggedIn == true;
}
