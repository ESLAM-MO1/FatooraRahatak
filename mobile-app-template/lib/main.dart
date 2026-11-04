import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/app_config.dart';
import 'state/app_state.dart';
import 'theme.dart';
import 'screens/home_screen.dart';
import 'screens/catalog_screen.dart';
import 'screens/cart_screen.dart';
import 'screens/account_screen.dart';
import 'screens/tracking_screen.dart';

/// متحكّم التبويبات (لتمكين التنقل من أي شاشة).
class TabController extends ChangeNotifier {
  int index = 0;
  static final TabController I = TabController._();
  TabController._();
  void go(int i) { index = i; notifyListeners(); }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppConfig.load();
  runApp(const StoreApp());
}

class StoreApp extends StatelessWidget {
  const StoreApp({super.key});
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState()..init(),
      child: MaterialApp(
        title: AppConfig.I.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.build(),
        locale: const Locale('ar'),
        builder: (context, child) => Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox.shrink(),
        ),
        home: const RootShell(),
      ),
    );
  }
}

class RootShell extends StatefulWidget {
  const RootShell({super.key});
  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  // خريطة كل مفتاح تبويب إلى شاشته وبياناته البصرية.
  static Widget _screenFor(String key) {
    switch (key) {
      case 'catalog':
      case 'categories':
        return const CatalogScreen();
      case 'cart':
        return const CartScreen();
      case 'tracking':
      case 'orders':
        return const TrackingScreen();
      case 'account':
        return const AccountScreen();
      case 'home':
      default:
        return const HomeScreen();
    }
  }

  static const _labelOf = <String, String>{
    'home': 'الرئيسية',
    'catalog': 'تصفّح',
    'categories': 'الأقسام',
    'cart': 'السلة',
    'tracking': 'طلباتي',
    'orders': 'طلباتي',
    'account': 'حسابي',
  };

  static const _iconOf = <String, IconData>{
    'home': Icons.home_outlined,
    'catalog': Icons.grid_view_outlined,
    'categories': Icons.grid_view_outlined,
    'cart': Icons.shopping_cart_outlined,
    'tracking': Icons.receipt_long_outlined,
    'orders': Icons.receipt_long_outlined,
    'account': Icons.person_outline,
  };

  static const _activeIconOf = <String, IconData>{
    'home': Icons.home,
    'catalog': Icons.grid_view,
    'categories': Icons.grid_view,
    'cart': Icons.shopping_cart,
    'tracking': Icons.receipt_long,
    'orders': Icons.receipt_long,
    'account': Icons.person,
  };

  @override
  Widget build(BuildContext context) {
    final c = AppConfig.I.colors;

    // ترتيب التبويبات كما اختاره التاجر، مع استبعاد غير المفعّلة.
    final navKeys = <String>[];
    for (final key in AppConfig.I.bottomNav) {
      final enabled = key == 'home' || (AppConfig.I.screens[key] ?? true);
      if (enabled && !navKeys.contains(key)) navKeys.add(key);
    }
    if (navKeys.isEmpty) navKeys.add('home');

    final screens = <Widget>[
      for (final key in navKeys) _screenFor(key),
    ];
    final labels = <String>[
      for (final key in navKeys) _labelOf[key] ?? 'الرئيسية',
    ];
    final icons = <IconData>[
      for (final key in navKeys) _iconOf[key] ?? Icons.circle_outlined,
    ];
    final activeIcons = <IconData>[
      for (final key in navKeys) _activeIconOf[key] ?? Icons.circle,
    ];

    // فهرس التبويب الخاص بالسلة (لزر السلة في الشريط العلوي).
    final cartIndex = navKeys.indexOf('cart');

    return AnimatedBuilder(
      animation: TabController.I,
      builder: (context, _) {
        final idx = TabController.I.index.clamp(0, screens.length - 1);
        final cartCount = context.watch<AppState>().cartCount;
        return Scaffold(
          appBar: AppBar(
            centerTitle: true,
            title: Text(AppConfig.I.appName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            actions: [
              if (cartIndex >= 0)
                IconButton(
                  icon: Badge(
                    isLabelVisible: cartCount > 0,
                    label: Text('$cartCount'),
                    child: const Icon(Icons.shopping_cart_outlined),
                  ),
                  onPressed: () => TabController.I.go(cartIndex),
                ),
            ],
          ),
          body: IndexedStack(index: idx, children: screens),
          bottomNavigationBar: NavigationBarTheme(
            data: NavigationBarThemeData(
              indicatorColor: c['button']!.withValues(alpha: 0.15),
              labelTextStyle: WidgetStateProperty.all(
                const TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
            ),
            child: NavigationBar(
              height: 62,
              selectedIndex: idx,
              onDestinationSelected: (i) => TabController.I.go(i),
              backgroundColor: Colors.white,
              surfaceTintColor: Colors.transparent,
              labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
              destinations: [
                for (var i = 0; i < labels.length; i++)
                  NavigationDestination(
                    icon: Icon(icons[i], size: 22, color: Colors.grey.shade500),
                    selectedIcon: Icon(activeIcons[i], size: 22, color: c['button']),
                    label: labels[i],
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
