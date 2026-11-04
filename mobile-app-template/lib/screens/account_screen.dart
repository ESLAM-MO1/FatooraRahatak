import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../state/app_state.dart';
import '../widgets/widgets.dart';
import 'catalog_screen.dart';
import 'tracking_screen.dart';
import '../main.dart' show TabController;

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final c = AppConfig.I.colors;
    final store = s.store;

    return ListView(children: [
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [c['heroFrom']!, c['heroTo']!]),
        ),
        child: Column(children: [
          CircleAvatar(
            radius: 34, backgroundColor: Colors.white24,
            backgroundImage: (store?.logo != null && store!.logo!.isNotEmpty) ? NetworkImage(store.logo!) : null,
            child: (store?.logo == null || store!.logo!.isEmpty)
                ? const Icon(Icons.store, color: Colors.white, size: 32) : null,
          ),
          const SizedBox(height: 10),
          Text(store?.name ?? AppConfig.I.appName,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
          if ((store?.bio ?? '').isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(store!.bio!, textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70, fontSize: 12)),
            ),
        ]),
      ),
      const SizedBox(height: 8),
      _tile(context, Icons.receipt_long_outlined, 'طلباتي', () =>
          Navigator.push(context, MaterialPageRoute(builder: (_) => const TrackingScreen()))),
      _tile(context, Icons.shopping_cart_outlined, 'سلة التسوق', () {
        TabController.I.go(2);
      }),
      _tile(context, Icons.local_offer_outlined, 'العروض', () =>
          Navigator.push(context, MaterialPageRoute(builder: (_) => const CatalogScreen()))),
      if ((store?.bio ?? '').isNotEmpty)
        _tile(context, Icons.info_outline, 'عن المتجر', () => _showAbout(context, s)),
      const Divider(height: 1),
      Padding(
        padding: const EdgeInsets.all(20),
        child: Column(children: [
          Text(AppConfig.I.appName,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          const SizedBox(height: 4),
          Text('الإصدار ${AppConfig.I.versionName}',
              style: const TextStyle(color: Colors.grey, fontSize: 12)),
        ]),
      ),
    ]);
  }

  void _showAbout(BuildContext context, AppState s) {
    showModalBottomSheet(context: context, shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(padding: const EdgeInsets.all(20), child: Column(
        mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(s.store?.name ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 8),
          Text(s.store?.bio ?? '', style: const TextStyle(height: 1.6, fontSize: 13)),
          const SizedBox(height: 16),
        ],
      )));
  }

  Widget _tile(BuildContext context, IconData icon, String label, VoidCallback onTap) {
    final c = AppConfig.I.colors;
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: c['button']!.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, color: c['button'], size: 20),
      ),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      trailing: const Icon(Icons.chevron_left, color: Colors.grey),
      onTap: onTap,
    );
  }
}
