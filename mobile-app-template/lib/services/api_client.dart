import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../models/models.dart';

/// عميل واجهة المتجر العام (PublicStore API) — بدون مصادقة.
class ApiClient {
  final String base;
  ApiClient() : base = AppConfig.I.apiBaseUrl;

  String get _slug => AppConfig.I.storeSlug;

  Future<dynamic> _get(String path, [Map<String, String>? q]) async {
    final uri = Uri.parse('$base/api/v1/public/stores/$_slug$path')
        .replace(queryParameters: q);
    final res = await http.get(uri, headers: {'Accept': 'application/json'});
    if (res.statusCode >= 400) {
      throw Exception('HTTP ${res.statusCode}');
    }
    return jsonDecode(utf8.decode(res.bodyBytes));
  }

  Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('$base/api/v1/public/stores/$_slug$path');
    final res = await http.post(uri,
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: jsonEncode(body));
    return jsonDecode(utf8.decode(res.bodyBytes));
  }

  Future<StoreInfo> getStore() async {
    final j = await _get('');
    return StoreInfo.fromJson(_unwrap(j));
  }

  Future<List<Category>> getCategories() async {
    final j = await _get('/categories');
    final list = _asList(_unwrap(j));
    return list.map((e) => Category.fromJson(e)).toList();
  }

  Future<List<Product>> getProducts({int? categoryId}) async {
    final j = await _get('/products', categoryId != null ? {'categoryId': '$categoryId'} : null);
    final list = _asList(_unwrap(j));
    return list.map((e) => Product.fromJson(e)).toList();
  }

  Future<Product> getProduct(String id) async {
    final j = await _get('/products/$id');
    return Product.fromJson(_unwrap(j));
  }

  Future<List<Product>> getRelated(String id) async {
    final j = await _get('/products/$id/related');
    final list = _asList(_unwrap(j));
    return list.map((e) => Product.fromJson(e)).toList();
  }

  Future<List<Product>> getOffers() async {
    final all = await getProducts();
    return all.where((p) => p.hasDiscount).toList();
  }

  Future<Map<String, dynamic>> checkout(Map<String, dynamic> payload) async {
    final j = await _post('/checkout', payload);
    return (j is Map && j['data'] is Map) ? (j['data'] as Map).cast<String, dynamic>() : {};
  }

  Future<Map<String, dynamic>> getOrder(String number, String phone) async {
    final j = await _get('/orders/$number', {'phone': phone});
    return _unwrap(j);
  }

  // ── مساعدات ──
  dynamic _unwrap(dynamic j) {
    if (j is Map && j.containsKey('data')) return j['data'];
    return j;
  }

  List<Map<String, dynamic>> _asList(dynamic d) {
    if (d is List) return d.map((e) => (e as Map).cast<String, dynamic>()).toList();
    if (d is Map) {
      for (final key in ['items', 'products', 'categories', 'data']) {
        if (d[key] is List) {
          return (d[key] as List).map((e) => (e as Map).cast<String, dynamic>()).toList();
        }
      }
    }
    return [];
  }
}
