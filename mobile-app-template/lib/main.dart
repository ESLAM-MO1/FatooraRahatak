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
  @override
  Widget build(BuildContext context) {
    final c = AppConfig.I.colors;
    final screens = <Widget>[
      if (AppConfig.I.screens['home'] ?? true) const HomeScreen(),
      if (AppConfig.I.screens['catalog'] ?? true) const CatalogScreen(),
      if (AppConfig.I.screens['cart'] ?? true) const CartScreen(),
      if (AppConfig.I.screens['tracking'] ?? true) const TrackingScreen(),
      if (AppConfig.I.screens['account'] ?? true) const AccountScreen(),
    ];
    final labels = <String>[
      if (AppConfig.I.screens['home'] ?? true) 'الرئيسية',
      if (AppConfig.I.screens['catalog'] ?? true) 'تصفّح',
      if (AppConfig.I.screens['cart'] ?? true) 'السلة',
      if (AppConfig.I.screens['tracking'] ?? true) 'طلباتي',
      if (AppConfig.I.screens['account'] ?? true) 'حسابي',
    ];
    final icons = <IconData>[
      if (AppConfig.I.screens['home'] ?? true) Icons.home_outlined,
      if (AppConfig.I.screens['catalog'] ?? true) Icons.grid_view_outlined,
      if (AppConfig.I.screens['cart'] ?? true) Icons.shopping_cart_outlined,
      if (AppConfig.I.screens['tracking'] ?? true) Icons.receipt_long_outlined,
      if (AppConfig.I.screens['account'] ?? true) Icons.person_outline,
    ];
    final activeIcons = <IconData>[
      if (AppConfig.I.screens['home'] ?? true) Icons.home,
      if (AppConfig.I.screens['catalog'] ?? true) Icons.grid_view,
      if (AppConfig.I.screens['cart'] ?? true) Icons.shopping_cart,
      if (AppConfig.I.screens['tracking'] ?? true) Icons.receipt_long,
      if (AppConfig.I.screens['account'] ?? true) Icons.person,
    ];

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
              if (AppConfig.I.screens['cart'] ?? true)
                IconButton(
                  icon: Badge(
                    isLabelVisible: cartCount > 0,
                    label: Text('$cartCount'),
                    child: const Icon(Icons.shopping_cart_outlined),
                  ),
                  onPressed: () => TabController.I.go(screens.length > 2 ? 2 : 0),
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
