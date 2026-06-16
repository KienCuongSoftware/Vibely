String formatCompactCount(int value) {
  final n = value < 0 ? 0 : value;
  if (n >= 1000000) {
    final m = n / 1000000;
    final text = m >= 10 ? m.toStringAsFixed(0) : m.toStringAsFixed(1);
    return '${text.replaceAll('.0', '')}M';
  }
  if (n >= 10000) {
    final k = n / 1000;
    return '${k.toStringAsFixed(0)}K';
  }
  if (n >= 1000) {
    final k = n / 1000;
    final text = k.toStringAsFixed(1).replaceAll('.', ',');
    return '${text}K';
  }
  return '$n';
}
