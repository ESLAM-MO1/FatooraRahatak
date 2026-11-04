import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// إعدادات التطبيق المولّدة لكل متجر من المنصة (assets/app_config.json).
/// يحقنها سيرفر البناء من بيانات المتجر وتصميمه قبل البناء.
class AppConfig {
  final String appName;
  final String tagline;
  final String storeSlug;
  final String apiBaseUrl;
  final String currency;
  final String packageName;
  final String versionName;
  final String iconUrl;
  final String splashText;
  final Map<String, Color> colors;
  final Map<String, bool> screens;

  AppConfig({
    required this.appName,
    required this.tagline,
    required this.storeSlug,
    required this.apiBaseUrl,
    required this.currency,
    required this.packageName,
    required this.versionName,
    required this.iconUrl,
    required this.splashText,
    required this.colors,
    required this.screens,
  });

  static Color _hex(String? v, Color fallback) {
    if (v == null || v.isEmpty) return fallback;
    var s = v.replaceAll('#', '').trim();
    if (s.length == 6) s = 'FF$s';
    return Color(int.tryParse(s, radix: 16) ?? fallback.value);
  }

  factory AppConfig.fromJson(Map<String, dynamic> j) {
    final c = (j['colors'] as Map?)?.cast<String, dynamic>() ?? {};
    final s = (j['screens'] as Map?)?.cast<String, dynamic>() ?? {};
    return AppConfig(
      appName: (j['appName'] ?? 'متجري').toString(),
      tagline: (j['tagline'] ?? '').toString(),
      storeSlug: (j['storeSlug'] ?? '').toString(),
      apiBaseUrl: (j['apiBaseUrl'] ?? 'https://rahtk.sa').toString(),
      currency: (j['currency'] ?? 'SAR').toString(),
      packageName: (j['packageName'] ?? 'sa.rahtk.app').toString(),
      versionName: (j['versionName'] ?? '1.0.0').toString(),
      iconUrl: (j['iconUrl'] ?? '').toString(),
      splashText: (j['splashText'] ?? '').toString(),
      colors: {
        'header': _hex(c['headerColor']?.toString(), const Color(0xFF0B5E78)),
        'button': _hex(c['buttonColor']?.toString(), const Color(0xFF12A8DB)),
        'accent': _hex(c['accentColor']?.toString(), const Color(0xFF1FB983)),
        'heroFrom': _hex(c['heroFrom']?.toString(), const Color(0xFF12A8DB)),
        'heroTo': _hex(c['heroTo']?.toString(), const Color(0xFF0B5E78)),
        'footer': _hex(c['footerColor']?.toString(), const Color(0xFF1F2937)),
      },
      screens: {
        for (final e in s.entries) e.key: e.value == true,
      },
    );
  }

  static AppConfig? _current;
  static AppConfig get I => _current!;

  static Future<void> load() async {
    final raw = await rootBundle.loadString('assets/app_config.json');
    _current = AppConfig.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  String get currencySymbol => currency == 'SAR' ? 'ر.س' : currency;
}
