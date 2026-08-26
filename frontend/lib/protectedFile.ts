import api from "@/lib/api";

/**
 * يفتح ملفًا محميًا (يتطلب توكن JWT) عبر رابط API،
 * بدل الرابط المباشر الذي لن يعمل بعد حذف الـ static serving العام.
 */
export async function openProtectedFile(url: string, fileName?: string) {
  try {
    const res = await api.get(url, { responseType: "blob" });
    const blob = res.data as Blob;
    const objectUrl = URL.createObjectURL(blob);

    // ✅ عرض الملف في تبويب جديد بدل التحميل (للمستندات، الصور، PDF...)
    window.open(objectUrl, "_blank", "noopener");
    // تحرير الـ URL بعد تأخير لمنع كسر العرض
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    return { ok: true as const };
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } | Blob } };
    let message = "";
    try {
      if (e?.response?.data instanceof Blob) {
        message = await e.response.data.text();
      } else {
        message = e?.response?.data?.message || "";
      }
    } catch {
      message = "";
    }
    return { ok: false as const, message };
  }
}