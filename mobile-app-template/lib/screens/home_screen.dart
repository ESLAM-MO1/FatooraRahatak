import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../state/app_state.dart';
import '../widgets/widgets.dart';
import '../screens/product_screen.dart';
import '../screens/catalog_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final c = AppConfig.I.colors;
    if (s.loading) return const Center(child: CircularProgressIndicator());
    if (s.error != null) {
      return Center(child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Icon(Icons.cloud_off, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          const Text('تعذّر تحميل بيانات المتجر'),
          const SizedBox(height: 12),
          AppButton(label: 'إعادة المحاولة', icon: Icons.refresh, onPressed: s.init),
        ]),
      ));
    }
    if (s.products.isEmpty && s.categories.isEmpty) {
      return const Center(child: Text('لا توجد منتجات منشورة بعد', style: TextStyle(color: Colors.grey)));
    }
    final offers = s.offers.take(6).toList();
    final featured = s.products.take(4).toList();
    final newArrivals = s.products.take(6).toList();

    // نبني الأقسام مرتّبة كما اختارها التاجر في المصمّم.
    final sections = <Widget>[];
    for (final key in AppConfig.I.homeSections) {
      switch (key) {
        case 'hero':
          sections.add(_hero(context, s, c));
          break;
        case 'categories':
          if (s.categories.isNotEmpty) {
            sections.addAll([const SectionTitle('الأقسام'), _categories(context, s, c)]);
          }
          break;
        case 'offers':
          if (offers.isNotEmpty) {
            sections.addAll([
              SectionTitle('العروض',
                  action: 'الكل',
                  onAction: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const CatalogScreen()))),
              _horizontalProducts(context, offers),
            ]);
          }
          break;
        case 'featured':
          if (featured.isNotEmpty) {
            sections.addAll([
              SectionTitle('منتجات مميزة',
                  action: 'الكل',
                  onAction: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const CatalogScreen()))),
              _gridProducts(context, featured),
            ]);
          }
          break;
        case 'newArrivals':
          if (newArrivals.isNotEmpty) {
            sections.addAll([
              SectionTitle('وصل حديثًا',
                  action: 'الكل',
                  onAction: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const CatalogScreen()))),
              _gridProducts(context, newArrivals),
            ]);
          }
          break;
        // أقسام إضافية يدعمها المصمّم (تُعرض إن توفّرت بياناتها لاحقًا).
        default:
          break;
      }
    }

    return RefreshIndicator(
      onRefresh: s.init,
      child: ListView(children: [
        if (AppConfig.I.splashText.isNotEmpty)
          Container(
            margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [c['heroFrom']!, c['heroTo']!]),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(children: [
              const Icon(Icons.local_offer, color: Colors.white, size: 16),
              const SizedBox(width: 8),
              Expanded(child: Text(AppConfig.I.splashText,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12))),
            ]),
          ),
        ...sections,
        const SizedBox(height: 20),
      ]),
    );
  }

  // البانر الرئيسي.
  Widget _hero(BuildContext context, AppState s, Map<String, Color> c) {
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft,
            colors: [c['heroFrom']!, c['heroTo']!]),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(s.store?.name ?? AppConfig.I.appName,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 17)),
        if ((s.store?.bio ?? '').isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(s.store!.bio!, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        ],
        const SizedBox(height: 12),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: c['button']),
          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CatalogScreen())),
          child: const Text('تسوّق الآن', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ]),
    );
  }

  // شريط الأقسام الأفقي.
  Widget _categories(BuildContext context, AppState s, Map<String, Color> c) {
    return SizedBox(
      height: 92,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: s.categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (_, i) {
          final cat = s.categories[i];
          return GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => CatalogScreen(categoryId: cat.id))),
            child: Column(children: [
              CircleAvatar(radius: 28, backgroundColor: c['accent']!.withValues(alpha: 0.12),
                backgroundImage: (cat.image != null && cat.image!.isNotEmpty) ? NetworkImage(cat.image!) : null,
                child: (cat.image == null || cat.image!.isEmpty)
                    ? Icon(Icons.category_outlined, color: c['accent']) : null),
              const SizedBox(height: 6),
              SizedBox(width: 64, child: Text(cat.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center, style: const TextStyle(fontSize: 11))),
            ]),
          );
        },
      ),
    );
  }

  // قائمة منتجات أفقية.
  Widget _horizontalProducts(BuildContext context, List<Product> items) {
    return SizedBox(
      height: 190,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (_, i) => SizedBox(width: 130,
          child: ProductCard(product: items[i],
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProductScreen.single(items[i]))))),
      ),
    );
  }

  // شبكة منتجات بعمودين.
  Widget _gridProducts(BuildContext context, List<Product> items) {
    return GridView.builder(
      shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 0.72),
      itemCount: items.length,
      itemBuilder: (_, i) => ProductCard(product: items[i],
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProductScreen.single(items[i])))),
    );
  }
}
