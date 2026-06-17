import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'auth/auth_controller.dart';
import 'features/for_you/for_you_screen.dart';
import 'theme/vibely_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  try {
    await AuthController.instance.hydrate();
  } catch (_) {
    // Never block app launch on auth storage.
  }
  runApp(const VibelyApp());
}

class VibelyApp extends StatelessWidget {
  const VibelyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AuthController.instance,
      builder: (context, _) {
        return MaterialApp(
          title: 'Vibely',
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            brightness: Brightness.dark,
            scaffoldBackgroundColor: VibelyColors.black,
            colorScheme: ColorScheme.fromSeed(
              seedColor: VibelyColors.tiktokRed,
              brightness: Brightness.dark,
            ),
            useMaterial3: true,
          ),
          home: const ForYouScreen(),
        );
      },
    );
  }
}
