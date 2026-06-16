import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'features/for_you/for_you_screen.dart';
import 'theme/vibely_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  runApp(const VibelyApp());
}

class VibelyApp extends StatelessWidget {
  const VibelyApp({super.key});

  @override
  Widget build(BuildContext context) {
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
  }
}
