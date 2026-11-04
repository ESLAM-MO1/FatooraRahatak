/// نماذج بيانات المتجر المستخدمة في التطبيق.

class StoreInfo {
  final int id;
  final String name;
  final String slug;
  final String? logo;
  final String? coverImage;
  final String? bio;
  final String currency;
  StoreInfo({required this.id, required this.name, required this.slug, this.logo, this.coverImage, this.bio, required this.currency});

  factory StoreInfo.fromJson(Map<String, dynamic> j) => StoreInfo(
        id: _i(j['id']),
        name: (j['storeName'] ?? j['name'] ?? '').toString(),
        slug: (j['storeSlug'] ?? j['slug'] ?? '').toString(),
        logo: j['logo']?.toString(),
        coverImage: j['coverImage']?.toString(),
        bio: (j['bio'] ?? j['bioLink'])?.toString(),
        currency: (j['currency'] ?? 'SAR').toString(),
      );
}

class Category {
  final int id;
  final String name;
  final String? image;
  Category({required this.id, required this.name, this.image});
  factory Category.fromJson(Map<String, dynamic> j) => Category(
        id: _i(j['id']),
        name: (j['nameAr'] ?? j['name'] ?? '').toString(),
        image: j['image']?.toString(),
      );
}

class Product {
  final int id;
  final String name;
  final double price;
  final double? discountPrice;
  final String? image;
  final int? categoryId;
  final String? description;
  final List<String> gallery;

  Product({
    required this.id, required this.name, required this.price,
    this.discountPrice, this.image, this.categoryId, this.description,
    this.gallery = const [],
  });

  bool get hasDiscount => discountPrice != null && discountPrice! < price;
  double get finalPrice => hasDiscount ? discountPrice! : price;
  int get discountPercent =>
      hasDiscount && price > 0 ? (100 - (discountPrice! / price * 100)).round() : 0;

  factory Product.fromJson(Map<String, dynamic> j) {
    final imgs = j['images'];
    final gallery = <String>[];
    if (imgs is List) {
      for (final i in imgs) {
        if (i is Map && i['imageUrl'] != null) gallery.add(i['imageUrl'].toString());
        else if (i is String) gallery.add(i);
      }
    }
    String? primary = j['mainImageUrl']?.toString() ?? j['imageUrl']?.toString();
    if (primary == null && gallery.isNotEmpty) primary = gallery.first;
    return Product(
      id: _i(j['id']),
      name: (j['nameAr'] ?? j['name'] ?? '').toString(),
      price: _d(j['basePrice'] ?? j['price']),
      discountPrice: (j['discountPrice'] == null) ? null : _d(j['discountPrice']),
      image: primary,
      categoryId: j['categoryId'] == null ? null : _i(j['categoryId']),
      description: (j['descriptionAr'] ?? j['description'])?.toString(),
      gallery: gallery,
    );
  }
}

class CartLine {
  final Product product;
  int qty;
  CartLine(this.product, [this.qty = 1]);
  double get total => product.finalPrice * qty;
}

int _i(dynamic v) => v is int ? v : int.tryParse(v?.toString() ?? '0') ?? 0;
double _d(dynamic v) => v is num ? v.toDouble() : double.tryParse(v?.toString() ?? '0') ?? 0;
