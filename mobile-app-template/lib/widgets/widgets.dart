import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../config/app_config.dart';
import '../models/models.dart';

class PriceText extends StatelessWidget {
  final Product product;
  final double size;
  const PriceText(this.product, {super.key, this.size = 14});

  @override
  Widget build(BuildContext context) {
    final c = AppConfig.I.colors;
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Text('${product.finalPrice.toStringAsFixed(0)} ${AppConfig.I.currencySymbol}',
          style: TextStyle(color: c['button'], fontWeight: FontWeight.w800, fontSize: size)),
      if (product.hasDiscount) ...[
        const SizedBox(width: 6),
        Text(product.price.toStringAsFixed(0),
            style: TextStyle(
                color: Colors.grey.shade400,
                fontSize: size - 3,
                decoration: TextDecoration.lineThrough)),
      ],
    ]);
  }
}

class ProductThumb extends StatelessWidget {
  final String? url;
  final double size;
  const ProductThumb({super.key, this.url, this.size = 90});
  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) {
      return Container(
        width: size, height: size, color: Colors.grey.shade100,
        child: Icon(Icons.image_outlined, color: Colors.grey.shade300, size: size / 3),
      );
    }
    return CachedNetworkImage(
      imageUrl: url!, width: size, height: size, fit: BoxFit.cover,
      errorWidget: (_, __, ___) => Container(
        width: size, height: size, color: Colors.grey.shade100,
        child: Icon(Icons.broken_image_outlined, color: Colors.grey.shade300),
      ),
    );
  }
}

class ProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback onTap;
  const ProductCard({super.key, required this.product, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = AppConfig.I.colors;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFEEF0F3)),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Stack(children: [
            AspectRatio(aspectRatio: 1, child: ProductThumb(url: product.image)),
            if (product.hasDiscount)
              Positioned(
                top: 6, right: 6,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: c['button'], borderRadius: BorderRadius.circular(20)),
                  child: Text('-${product.discountPercent}%',
                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                ),
              ),
          ]),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
              const SizedBox(height: 4),
              PriceText(product, size: 12),
            ]),
          ),
        ]),
      ),
    );
  }
}

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool outline;
  const AppButton({super.key, required this.label, this.onPressed, this.icon, this.outline = false});

  @override
  Widget build(BuildContext context) {
    final c = AppConfig.I.colors;
    if (outline) {
      return OutlinedButton.icon(
        onPressed: onPressed,
        icon: icon != null ? Icon(icon, size: 18) : const SizedBox.shrink(),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          foregroundColor: c['button'], minimumSize: const Size.fromHeight(46),
          side: BorderSide(color: c['button']!),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
    return FilledButton.icon(
      onPressed: onPressed,
      icon: icon != null ? Icon(icon, size: 18) : const SizedBox.shrink(),
      label: Text(label),
      style: FilledButton.styleFrom(
        backgroundColor: c['button'], minimumSize: const Size.fromHeight(46),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;
  const SectionTitle(this.title, {super.key, this.action, this.onAction});
  @override
  Widget build(BuildContext context) {
    final c = AppConfig.I.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(children: [
        Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF1F2937))),
        const Spacer(),
        if (action != null)
          GestureDetector(onTap: onAction,
            child: Text(action!, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: c['button']))),
      ]),
    );
  }
}
