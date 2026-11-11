import 'package:flutter/material.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../services/api_client.dart';

/// حالة التطبيق: المتجر، المنتجات، الأقسام، والسلة.
class AppState extends ChangeNotifier {
  final ApiClient api = ApiClient();

  StoreInfo? store;
  List<Category> categories = [];
  List<Product> products = [];
  final List<CartLine> cart = [];
  bool loading = true;
  String? error;

  /// يُضبط عندما يردّ الباك إند بأن اشتراك التطبيق منتهٍ (HTTP 402)،
  /// فتعرض الواجهة شاشة تجديد تمنع الاستخدام حتى التجديد.
  bool subscriptionExpired = false;

  int? selectedCategory;

  Future<void> init() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        api.getStore(),
        api.getCategories(),
        api.getProducts(),
      ]);
      store = results[0] as StoreInfo;
      categories = results[1] as List<Category>;
      products = results[2] as List<Product>;
    } on AppSubscriptionExpiredException catch (e) {
      subscriptionExpired = true;
      error = e.message;
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void selectCategory(int? id) {
    selectedCategory = id;
    notifyListeners();
  }

  List<Product> get visibleProducts => selectedCategory == null
      ? products
      : products.where((p) => p.categoryId == selectedCategory).toList();

  List<Product> get offers => products.where((p) => p.hasDiscount).toList();

  // ── السلة ──
  void addToCart(Product p) {
    final i = cart.indexWhere((l) => l.product.id == p.id);
    if (i >= 0) {
      cart[i].qty++;
    } else {
      cart.add(CartLine(p));
    }
    notifyListeners();
  }

  void removeFromCart(Product p) {
    cart.removeWhere((l) => l.product.id == p.id);
    notifyListeners();
  }

  void setQty(Product p, int qty) {
    final i = cart.indexWhere((l) => l.product.id == p.id);
    if (i < 0) return;
    if (qty <= 0) {
      cart.removeAt(i);
    } else {
      cart[i].qty = qty;
    }
    notifyListeners();
  }

  double get cartSubtotal => cart.fold(0.0, (s, l) => s + l.total);
  int get cartCount => cart.fold(0, (s, l) => s + l.qty);

  AppConfig get config => AppConfig.I;
}
