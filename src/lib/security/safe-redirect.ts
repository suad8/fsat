/**
 * وجهة إعادة التوجيه بعد الدخول (المعامل next).
 *
 * تُقبل فقط مسارات داخلية تحت /admin. نحلّل القيمة بـ URL مقابل أصل وهمي ثم
 * نتأكد أن الأصل لم يتغيّر، فتسقط كل الحيل: //evil.com, /\evil.com,
 * https://evil.com, javascript:, %2f%2f, محارف تحكم/تبويب داخل المسار …
 * الناتج دائمًا مسار + استعلام منقَّحان، لا النص الأصلي.
 */

const FALLBACK = "/admin";

export function safeAdminNext(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 500) return FALLBACK;

  // محارف تحكمية أو باك-سلاش: يفسّرها المتصفّح بطرق مختلفة عن الخادم
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return FALLBACK;
  if (!value.startsWith("/") || value.startsWith("//")) return FALLBACK;

  try {
    const base = "http://internal.invalid";
    const url = new URL(value, base);

    if (url.origin !== base) return FALLBACK;
    if (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/")) return FALLBACK;
    // لا نعيد المستخدم لصفحة الدخول نفسها (حلقة)
    if (url.pathname === "/admin/login") return FALLBACK;

    return `${url.pathname}${url.search}`;
  } catch {
    return FALLBACK;
  }
}
