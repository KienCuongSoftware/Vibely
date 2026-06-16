import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('Vibely app shows For You tab', (WidgetTester tester) async {
    await tester.pumpWidget(const VibelyApp());
    await tester.pump();

    expect(find.text('Đề xuất'), findsOneWidget);
    expect(find.text('Trang chủ'), findsOneWidget);
  });
}
