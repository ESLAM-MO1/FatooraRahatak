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
    return Scaffold(
      appBar: AppBar(title: const Text('تصفّح المتجر')),
      body: Column(children: [
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
        if (widget.categoryId == null && s.categories.isNotEmpty)
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
                  selectedColor: c['button']!.withValues(alpha: 0.15),
                  labelStyle: TextStyle(color: selected ? c['button'] : Colors.black87, fontWeight: FontWeight.bold, fontSize: 12),
                );
              },
            ),
          ),
        Expanded(
          child: items.isEmpty
              ? const Center(child: Text('لا توجد منتجات', style: TextStyle(color: Colors.grey)))
              : GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 0.72),
                  itemCount: items.length,
                  itemBuilder: (_, i) => ProductCard(product: items[i],
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProductScreen(products: items[i])))),
                ),
        ),
      ]),
    );
  }
}
