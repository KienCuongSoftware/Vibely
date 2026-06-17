import 'package:flutter/material.dart';

import '../../../theme/vibely_theme.dart';

const Color authSurface = Color(0xFF09090B);
const Color authFieldBg = Color(0xFF27272A);
const Color authMuted = Color(0xFFA1A1AA);

InputDecoration authInputDecoration({
  String? hintText,
  Widget? suffixIcon,
  String? prefixText,
}) {
  return InputDecoration(
    hintText: hintText,
    hintStyle: const TextStyle(color: Color(0xFF71717A), fontSize: 15),
    prefixText: prefixText,
    prefixStyle: const TextStyle(color: Colors.white, fontSize: 15),
    suffixIcon: suffixIcon,
    filled: true,
    fillColor: authFieldBg,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: BorderSide.none,
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: BorderSide.none,
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: Color(0xFF52525B)),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: VibelyColors.tiktokRed),
    ),
  );
}

ButtonStyle authPrimaryButtonStyle({bool enabled = true}) {
  return FilledButton.styleFrom(
    backgroundColor: enabled ? VibelyColors.tiktokRed : authFieldBg,
    foregroundColor: enabled ? Colors.white : authMuted,
    disabledBackgroundColor: authFieldBg,
    disabledForegroundColor: authMuted,
    minimumSize: const Size.fromHeight(48),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
  );
}
