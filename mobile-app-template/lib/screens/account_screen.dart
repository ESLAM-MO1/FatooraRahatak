import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../state/app_state.dart';
import 'tracking_screen.dart';
import '../main.dart' show TabController;

/// شاشة الحساب — تطابق حساب العميل في متجرك:
/// تسجيل دخول (بريد → رمز تحقق) ثم تبويبات: طلباتي / العناوين / بياناتي، مع تسجيل الخروج.
class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _loggedIn = false;
  bool _codeStep = false;
  String _email = '';
  int _tab = 0; // 0 orders, 1 addresses, 2 profile

  @override
  Widget build(BuildContext context) {
    final c = AppConfig.I.colors;
    if (!_loggedIn) return _loginView(context, c);
    return _accountView(context, c);
  }

  // ── تسجيل الدخول ──
  Widget _loginView(BuildContext context, Map<String, Color> c) {
    return ListView(padding: const EdgeInsets.all(20), children: [
      const SizedBox(height: 20),
      Center(
        child: Container(
          width: 64, height: 64,
          decoration: BoxDecoration(color: c['button']!.withValues(alpha: 0.12), shape: BoxShape.circle),
          child: Icon(Icons.person_outline, color: c['button'], size: 30),
        ),
      ),
      const SizedBox(height: 16),
      const Center(child: Text('حسابي', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18))),
      const SizedBox(height: 6),
      const Center(child: Text('سجّل الدخول للاطلاع على طلباتك وعناوينك وبياناتك', textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey, fontSize: 13))),
      const SizedBox(height: 24),
      if (!_codeStep) ...[
        const Text('البريد الإلكتروني', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
        const SizedBox(height: 6),
        TextField(
          keyboardType: TextInputType.emailAddress,
          textDirection: TextDirection.ltr,
          decoration: InputDecoration(hintText: 'example@domain.com', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
          onChanged: (v) => _email = v,
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 48,
          child: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: c['button'], shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            onPressed: () => setState(() => _codeStep = true),
            child: const Text('إرسال رمز التحقق', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ),
      ] else ...[
        const Text('أدخل رمز التحقق المُرسل إلى بريدك', style: TextStyle(color: Colors.grey, fontSize: 12)),
        const SizedBox(height: 6),
        const Text('رمز التحقق', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
        const SizedBox(height: 6),
        const TextField(
          keyboardType: TextInputType.number, textAlign: TextAlign.center, textDirection: TextDirection.ltr,
          decoration: InputDecoration(hintText: '••••', border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12)))),
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 48,
          child: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: c['button'], shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            onPressed: () => setState(() => _loggedIn = true),
            child: const Text('تأكيد الدخول', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ),
        TextButton(onPressed: () => setState(() => _codeStep = false), child: const Text('رجوع')),
      ],
    ]);
  }

  // ── الحساب بعد الدخول ──
  Widget _accountView(BuildContext context, Map<String, Color> c) {
    final s = context.watch<AppState>();
    final store = s.store;
    return ListView(children: [
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(gradient: LinearGradient(colors: [c['heroFrom']!, c['heroTo']!])),
        child: Row(children: [
          CircleAvatar(
            radius: 26, backgroundColor: Colors.white24,
            backgroundImage: (store?.logo != null && store!.logo!.isNotEmpty) ? NetworkImage(store.logo!) : null,
            child: (store?.logo == null || store!.logo!.isEmpty)
                ? const Icon(Icons.person, color: Colors.white, size: 26) : null,
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('أهلاً بك', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
            Text(store?.name ?? AppConfig.I.appName, style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ])),
          TextButton(
            style: TextButton.styleFrom(backgroundColor: Colors.white24, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4)),
            onPressed: () => setState(() { _loggedIn = false; _codeStep = false; }),
            child: const Text('تسجيل الخروج', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ]),
      ),
      const SizedBox(height: 12),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(children: [
          _tabBtn(0, 'طلباتي', c),
          const SizedBox(width: 6),
          _tabBtn(1, 'العناوين', c),
          const SizedBox(width: 6),
          _tabBtn(2, 'بياناتي', c),
        ]),
      ),
      const SizedBox(height: 12),
      if (_tab == 0) ...[
        _orderTile(c, '#10245', 'تم الشحن', '320'),
        _orderTile(c, '#10231', 'تم التوصيل', '180'),
      ] else if (_tab == 1) ...[
        _tile(context, Icons.location_on_outlined, 'المنزل — الرياض، حي النخيل', () {}),
        _tile(context, Icons.location_on_outlined, 'العمل — الرياض، طريق الملك فهد', () {}),
      ] else ...[
        _tile(context, Icons.email_outlined, 'البريد الإلكتروني', () {}),
        _tile(context, Icons.phone_outlined, 'رقم الجوال', () {}),
      ],
      const Divider(height: 24),
      _tile(context, Icons.receipt_long_outlined, 'تتبّع طلبي', () =>
          Navigator.push(context, MaterialPageRoute(builder: (_) => const TrackingScreen()))),
      const Divider(height: 1),
      Padding(
        padding: const EdgeInsets.all(20),
        child: Column(children: [
          Text(AppConfig.I.appName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          const SizedBox(height: 4),
          Text('الإصدار ${AppConfig.I.versionName}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
        ]),
      ),
    ]);
  }

  Widget _tabBtn(int i, String label, Map<String, Color> c) {
    final active = _tab == i;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _tab = i),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: active ? c['button'] : Colors.grey.shade200,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(label, textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: active ? Colors.white : Colors.grey.shade700)),
        ),
      ),
    );
  }

  Widget _orderTile(Map<String, Color> c, String id, String status, String total) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
      child: ListTile(
        title: Text(id, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
        subtitle: Text(status, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        trailing: Text('$total ${AppConfig.I.currencySymbol}',
            style: TextStyle(fontWeight: FontWeight.w800, color: c['button'], fontSize: 13)),
      ),
    );
  }

  Widget _tile(BuildContext context, IconData icon, String label, VoidCallback onTap) {
    final c = AppConfig.I.colors;
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: c['button']!.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, color: c['button'], size: 20),
      ),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      trailing: const Icon(Icons.chevron_left, color: Colors.grey),
      onTap: onTap,
    );
  }
}
