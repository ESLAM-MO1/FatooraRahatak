import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../state/app_state.dart';
import '../widgets/widgets.dart';

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key});
  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  final _number = TextEditingController();
  final _phone = TextEditingController();
  bool _busy = false;
  Map<String, dynamic>? _order;
  String? _error;

  @override
  void dispose() { _number.dispose(); _phone.dispose(); super.dispose(); }

  Future<void> _track() async {
    if (_number.text.trim().isEmpty || _phone.text.trim().isEmpty) {
      setState(() => _error = 'أدخل رقم الطلب ورقم الجوال');
      return;
    }
    setState(() { _busy = true; _error = null; _order = null; });
    try {
      final s = context.read<AppState>();
      final res = await s.api.getOrder(_number.text.trim(), _phone.text.trim());
      setState(() => _order = res.isEmpty ? null : res);
      if (res.isEmpty) setState(() => _error = 'لم يتم العثور على الطلب');
    } catch (e) {
      setState(() => _error = 'لم يتم العثور على الطلب، تحقّق من البيانات');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppConfig.I.colors;
    return Scaffold(
      appBar: AppBar(title: const Text('تتبّع الطلب')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        TextField(
          controller: _number,
          decoration: InputDecoration(
            labelText: 'رقم الطلب', prefixIcon: const Icon(Icons.receipt_outlined),
            filled: true, fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _phone, keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            labelText: 'رقم الجوال', prefixIcon: const Icon(Icons.phone_outlined),
            filled: true, fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
        const SizedBox(height: 16),
        _busy ? const Center(child: CircularProgressIndicator())
              : AppButton(label: 'تتبّع', icon: Icons.search, onPressed: _track),
        const SizedBox(height: 20),
        if (_error != null)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(12)),
            child: Row(children: [
              Icon(Icons.error_outline, color: Colors.red.shade400),
              const SizedBox(width: 8),
              Expanded(child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13))),
            ]),
          ),
        if (_order != null) _orderCard(_order!, c),
      ]),
    );
  }

  Widget _orderCard(Map<String, dynamic> o, Map<String, Color> c) {
    final status = (o['statusName'] ?? o['status'] ?? '').toString();
    final total = o['totalAmount'] ?? o['total'] ?? 0;
    final items = (o['items'] is List) ? (o['items'] as List) : [];
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEEF0F3)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.check_circle, color: c['accent'], size: 20),
          const SizedBox(width: 8),
          Text('الطلب #${o['orderNumber'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
        ]),
        const SizedBox(height: 12),
        _kv('الحالة', status),
        if (total != null) _kv('الإجمالي', '$total ${AppConfig.I.currencySymbol}'),
        if (o['createdAt'] != null) _kv('التاريخ', o['createdAt'].toString().split('T').first),
        if (items.isNotEmpty) ...[
          const Divider(height: 24),
          const Text('المنتجات', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
          const SizedBox(height: 8),
          ...items.map((it) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(children: [
              Expanded(child: Text('${it['productName'] ?? it['name'] ?? ''}',
                  style: const TextStyle(fontSize: 12))),
              Text('×${it['quantity'] ?? 1}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ]),
          )),
        ],
      ]),
    );
  }

  Widget _kv(String k, String v) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Row(children: [
      Text(k, style: const TextStyle(color: Colors.grey, fontSize: 12)),
      const Spacer(),
      Text(v, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
    ]),
  );
}
