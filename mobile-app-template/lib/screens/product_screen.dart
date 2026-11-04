import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/widgets.dart';
import '../services/api_client.dart';
import '../main.dart' show TabController;

class ProductScreen extends StatefulWidget {
  final List<Product> products;
  final int index;
  const ProductScreen({super.key, required this.products, this.index = 0});

  // convenience: single product
  factory ProductScreen.single(Product p) => ProductScreen(products: [p]);

  @override
  State<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends State<ProductScreen> {
  late PageController _page;
  late int _index;
  int _qty = 1;
  List<Product> _related = [];

  Product get product => widget.products[_index];

  @override
  void initState() {
    super.initState();
    _index = widget.index;
    _page = PageController(initialPage: _index);
    _loadRelated();
  }

  Future<void> _loadRelated() async {
    try {
      final r = await ApiClient().getRelated(product.id.toString());
      if (mounted) setState(() => _related = r);
    } catch (_) {}
  }

  @override
  void dispose() {
    _page.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = product;
    final c = AppConfig.I.colors;
    final s = context.read<AppState>();

    return Scaffold(
      appBar: AppBar(title: Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
      body: ListView(children: [
        // صور
        AspectRatio(
          aspectRatio: 1,
          child: p.gallery.isEmpty
              ? ProductThumb(url: p.image, size: double.infinity)
              : PageView.builder(
                  controller: _page,
                  itemCount: p.gallery.length,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemBuilder: (_, i) => ProductThumb(url: p.gallery[i], size: double.infinity),
                ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(p.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Row(children: [
              PriceText(p, size: 20),
              const SizedBox(width: 10),
              if (p.hasDiscount)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: c['accent'], borderRadius: BorderRadius.circular(20)),
                  child: Text('خصم ${p.discountPercent}%',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
            ]),
            const SizedBox(height: 16),
            if ((p.description ?? '').isNotEmpty) ...[
              const Text('الوصف', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
              const SizedBox(height: 6),
              Text(p.description!, style: const TextStyle(color: Color(0xFF4B5563), height: 1.6, fontSize: 13)),
              const SizedBox(height: 16),
            ],
            // الكمية
            Row(children: [
              const Text('الكمية', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
              const Spacer(),
              _qtyBtn(Icons.remove, () { if (_qty > 1) setState(() => _qty--); }),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text('$_qty', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              _qtyBtn(Icons.add, () => setState(() => _qty++)),
            ]),
            const SizedBox(height: 20),
            AppButton(
              label: 'أضف إلى السلة',
              icon: Icons.shopping_cart_outlined,
              onPressed: () {
                for (var i = 0; i < _qty; i++) { s.addToCart(p); }
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('تمت الإضافة إلى السلة'), duration: Duration(seconds: 2)),
                );
              },
            ),
            const SizedBox(height: 10),
            AppButton(
              label: 'اشترِ الآن',
              icon: Icons.flash_on,
              outline: true,
              onPressed: () {
                for (var i = 0; i < _qty; i++) { s.addToCart(p); }
                Navigator.of(context).popUntil((r) => r.isFirst);
                TabController.I.go(2);
              },
            ),
          ]),
        ),
        if (_related.isNotEmpty) ...[
          const SectionTitle('منتجات مشابهة'),
          SizedBox(
            height: 190,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _related.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (_, i) => SizedBox(
                width: 130,
                child: ProductCard(
                  product: _related[i],
                  onTap: () => Navigator.pushReplacement(context,
                      MaterialPageRoute(builder: (_) => ProductScreen(products: _related, index: i))),
                ),
              ),
            ),
          ),
        ],
        const SizedBox(height: 20),
      ]),
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap) {
    final c = AppConfig.I.colors;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          border: Border.all(color: c['button']!.withValues(alpha: 0.4)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 18, color: c['button']),
      ),
    );
  }
}
