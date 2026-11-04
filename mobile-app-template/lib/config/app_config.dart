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
  final List<String> bottomNav;
  final List<String> homeSections;
  final Map<String, Map<String, bool>> screenItems;

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
    required this.bottomNav,
    required this.homeSections,
    required this.screenItems,
  });

  /// هل العنصر مفعّل في شاشة معيّنة؟ (الافتراضي: مفعّل)
  bool item(String screen, String key) => screenItems[screen]?[key] ?? true;

  /// هل قسم الشاشة الرئيسية مفعّل وظاهر؟
  bool hasHomeSection(String key) => homeSections.contains(key);

  static Color _hex(String? v, Color fallback) {
    if (v == null || v.isEmpty) return fallback;
    var s = v.replaceAll('#', '').trim();
    if (s.length == 6) s = 'FF$s';
    return Color(int.tryParse(s, radix: 16) ?? fallback.value);
  }

  factory AppConfig.fromJson(Map<String, dynamic> j) {
    final c = (j['colors'] as Map?)?.cast<String, dynamic>() ?? {};
    final s = (j['screens'] as Map?)?.cast<String, dynamic>() ?? {};

    // شريط التنقل السفلي: الترتيب الذي اختاره التاجر (الافتراضي: الرئيسية/الأقسام/السلة/حسابي).
    final bottomNav = ((j['bottomNav'] as List?) ?? const [])
        .map((e) => e.toString())
        .where((e) => e.isNotEmpty)
        .toList();
    if (bottomNav.isEmpty) {
      bottomNav.addAll(['home', 'categories', 'cart', 'account']);
    }

    // أقسام الشاشة الرئيسية بالترتيب (المفعّلة فقط)، وإلا الافتراضية.
    final homeSections = ((j['homeSections'] as List?) ?? const [])
        .map((e) => e.toString())
        .where((e) => e.isNotEmpty)
        .toList();
    if (homeSections.isEmpty) {
      homeSections.addAll(['hero', 'categories', 'featured', 'newArrivals', 'offers']);
    }

    // عناصر الشاشات الداخلية: { screen: { itemKey: bool } }
    final screenItemsRaw = (j['screenItems'] as Map?)?.cast<String, dynamic>() ?? {};
    final screenItems = <String, Map<String, bool>>{};
    screenItemsRaw.forEach((screen, v) {
      if (v is Map) {
        screenItems[screen] = {
          for (final e in v.entries) e.key.toString(): e.value == true,
        };
      }
    });

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
      bottomNav: bottomNav,
      homeSections: homeSections,
      screenItems: screenItems,
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
