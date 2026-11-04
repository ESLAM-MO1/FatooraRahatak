import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../state/app_state.dart';
import '../widgets/widgets.dart';
import '../screens/product_screen.dart';

class CatalogScreen extends StatefulWidget {
  final int? categoryId;
  const CatalogScreen({super.key, this.categoryId});
  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final c = AppConfig.I.colors;
    var items = widget.categoryId != null
        ? s.products.where((p) => p.categoryId == widget.categoryId).toList()
        : s.visibleProducts;
    if (_q.isNotEmpty) {
      items = items.where((p) => p.name.contains(_q)).toList();
    }
    final cfg = AppConfig.I;
    return Scaffold(
      appBar: AppBar(title: const Text('تصفّح المتجر')),
      body: Column(children: [
        if (cfg.item('catalog', 'search'))
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              onChanged: (v) => setState(() => _q = v),
              decoration: InputDecoration(
                hintText: 'ابحث في المتجر...',
                prefixIcon: const Icon(Icons.search),
                filled: true, fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
        if (cfg.item('catalog', 'categories') && widget.categoryId == null && s.categories.isNotEmpty)
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: s.categories.length + 1,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final isAll = i == 0;
                final cat = isAll ? null : s.categories[i - 1];
                final selected = isAll ? s.selectedCategory == null : s.selectedCategory == cat!.id;
                return ChoiceChip(
                  label: Text(isAll ? 'الكل' : cat!.name),
                  selected: selected,
                  onSelected: (_) => s.selectCategory(isAll ? null : cat!.id),
                  selectedColor: c['button']!.withOpacity(0.15),
                  labelStyle: TextStyle(color: selected ? c['button'] : Colors.black87, fontWeight: FontWeight.bold, fontSize: 12),
                );
              },
            ),
          ),
        Expanded(
          child: items.isEmpty
              ? const Center(child: Text('لا توجد منتجات', style: TextStyle(color: Colors.grey)))
              // إن كان عرض الشبكة معطّلًا، نعرض قائمة عمودية بسيطة.
              : cfg.item('catalog', 'grid')
                  ? GridView.builder(
                      padding: const EdgeInsets.all(12),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 0.72),
                      itemCount: items.length,
                      itemBuilder: (_, i) => ProductCard(product: items[i],
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProductScreen.single(items[i])))),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: items.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => Row(children: [
                        ClipRRect(borderRadius: BorderRadius.circular(10), child: ProductThumb(url: items[i].image, size: 72)),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(items[i].name, maxLines: 2, overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          const SizedBox(height: 6),
                          PriceText(items[i], size: 14),
                        ])),
                        IconButton(
                          icon: Icon(Icons.chevron_left, color: c['button']),
                          onPressed: () => Navigator.push(context,
                              MaterialPageRoute(builder: (_) => ProductScreen.single(items[i]))),
                        ),
                      ]),
                    ),
        ),
      ]),
    );
  }
}
