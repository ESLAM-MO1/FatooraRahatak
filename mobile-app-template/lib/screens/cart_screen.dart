import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../state/app_state.dart';
import '../widgets/widgets.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final c = AppConfig.I.colors;

    if (s.cart.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.shopping_cart_outlined, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          const Text('السلة فارغة', style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 4),
          const Text('أضف منتجات لتظهر هنا', style: TextStyle(color: Colors.grey, fontSize: 12)),
        ]),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        ...s.cart.map((line) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFEEF0F3)),
          ),
          child: Row(children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: ProductThumb(url: line.product.image, size: 64),
            ),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(line.product.name, maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              PriceText(line.product, size: 14),
            ])),
            Column(children: [
              InkWell(
                onTap: () => s.setQty(line.product, line.qty + 1),
                child: _mini(Icons.add, c['button']!),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text('${line.qty}', style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
              InkWell(
                onTap: () => s.setQty(line.product, line.qty - 1),
                child: _mini(Icons.remove, Colors.grey),
              ),
            ]),
          ]),
        )),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFEEF0F3)),
          ),
          child: Column(children: [
            _row('المجموع الجزئي', '${s.cartSubtotal.toStringAsFixed(0)} ${AppConfig.I.currencySymbol}'),
            const SizedBox(height: 8),
            _row('الشحن', 'يُحدّد عند إتمام الطلب'),
            const Divider(height: 24),
            _row('الإجمالي', '${s.cartSubtotal.toStringAsFixed(0)} ${AppConfig.I.currencySymbol}', bold: true),
          ]),
        ),
        const SizedBox(height: 14),
        AppButton(
          label: 'إتمام الطلب',
          icon: Icons.check_circle_outline,
          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CheckoutScreen())),
        ),
      ],
    );
  }

  Widget _mini(IconData icon, Color color) => Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(border: Border.all(color: color.withValues(alpha: 0.4)), borderRadius: BorderRadius.circular(6)),
        child: Icon(icon, size: 16, color: color),
      );

  Widget _row(String k, String v, {bool bold = false}) => Row(children: [
        Text(k, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.normal, fontSize: bold ? 15 : 13, color: const Color(0xFF374151))),
        const Spacer(),
        Text(v, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w600, fontSize: bold ? 15 : 13, color: AppConfig.I.colors['button'])),
      ]);
}

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _notes = TextEditingController();
  bool _busy = false;
  String? _orderNumber;

  @override
  void dispose() {
    _name.dispose(); _phone.dispose(); _address.dispose(); _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final s = context.read<AppState>();
    if (_name.text.trim().isEmpty || _phone.text.trim().isEmpty || _address.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى إكمال بيانات الاسم والجوال والعنوان')));
      return;
    }
    setState(() => _busy = true);
    try {
      final payload = {
        'customerName': _name.text.trim(),
        'customerPhone': _phone.text.trim(),
        'customerAddress': _address.text.trim(),
        'notes': _notes.text.trim(),
        'items': s.cart.map((l) => {
          'productId': l.product.id,
          'quantity': l.qty,
          'unitPrice': l.product.finalPrice,
        }).toList(),
      };
      final res = await s.api.checkout(payload);
      final number = (res['orderNumber'] ?? res['number'] ?? '').toString();
      setState(() { _orderNumber = number.isEmpty ? '—' : number; });
      s.cart.clear();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذّر إتمام الطلب، حاول مرة أخرى')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_orderNumber != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('تم استلام الطلب')),
        body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(
          mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.check_circle, size: 72, color: AppConfig.I.colors['accent']),
            const SizedBox(height: 16),
            const Text('تم استلام طلبك بنجاح', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text('رقم الطلب: $_orderNumber', style: const TextStyle(fontSize: 15)),
            const SizedBox(height: 8),
            const Text('سيتواصل معك المتجر لتأكيد الطلب', style: TextStyle(color: Colors.grey, fontSize: 12)),
            const SizedBox(height: 20),
            AppButton(label: 'العودة للرئيسية', icon: Icons.home,
                onPressed: () => Navigator.popUntil(context, (r) => r.isFirst)),
          ],
        ))),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('إتمام الطلب')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _field(_name, 'الاسم الكامل', Icons.person_outline),
        _field(_phone, 'رقم الجوال', Icons.phone_outlined, keyboard: TextInputType.phone),
        _field(_address, 'العنوان', Icons.location_on_outlined, maxLines: 2),
        _field(_notes, 'ملاحظات (اختياري)', Icons.notes_outlined, maxLines: 2),
        const SizedBox(height: 20),
        _busy
            ? const Center(child: CircularProgressIndicator())
            : AppButton(label: 'تأكيد الطلب', icon: Icons.check, onPressed: _submit),
      ]),
    );
  }

  Widget _field(TextEditingController c, String label, IconData icon,
      {TextInputType? keyboard, int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: c, keyboardType: keyboard, maxLines: maxLines,
        decoration: InputDecoration(
          labelText: label, prefixIcon: Icon(icon),
          filled: true, fillColor: Colors.white,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        ),
      ),
    );
  }
}
