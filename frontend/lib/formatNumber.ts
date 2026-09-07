export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("en-US", options).format(n);
}

/**
 * صيغة موحدة لعرض المبالغ المالية في صفحات الباقات والاشتراك:
 * — ترقيم آلاف عربي مع أرقام لاتينية (مطابق لبقية تطبيقات النظام)
 * — منزلتان عشريتان دائمًا
 * — يُرفق رمز العملة الموحد (ر.س) من ملف الترجمات، وليس نص "SAR" مكتوبًا يدويًا
 */
export function formatMoney(n: number): string {
  return new Intl.NumberFormat("ar-SA-u-nu-latn", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}