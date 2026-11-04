import 'package:flutter/material.dart';
import '../config/app_config.dart';

/// سِمة التطبيق المشتقة من تصميم المتجر المحقون.
class AppTheme {
  static ThemeData build() {
    final c = AppConfig.I.colors;
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: c['button']!),
      scaffoldBackgroundColor: const Color(0xFFF7F8FA),
      fontFamily: 'Roboto',
      appBarTheme: AppBarTheme(
        backgroundColor: c['header'],
        foregroundColor: Colors.white,
        elevation: 0,
      ),
    );
  }
}
