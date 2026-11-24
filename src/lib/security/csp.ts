/**
 * سياسات أمان المحتوى (CSP).
 *
 * سياستان لسبب معماري لا للتساهل:
 *
 *  ١. لوحة الإدارة (/admin): صفحاتها ديناميكية أصلًا، فنستعمل nonce لكل طلب مع
 *     'strict-dynamic' — لا يُنفَّذ أي سكربت مضمَّن بلا nonce، وهذا أهم مكان
 *     لأنه يعرض بيانات أدخلها الزوار (رسائل، طلبات) ويحمل الجلسة.
 *     يُولَّد الـ nonce في src/proxy.ts ويطبّقه Next.js تلقائيًا على سكربتاته.
 *
 *  ٢. الموقع العام: صفحاته مولَّدة ستاتيكيًا وقت البناء (سرعة + CDN)، والـ nonce
 *     يُجبر كل صفحة على التوليد عند كل طلب. لذا نسمح بـ 'unsafe-inline' للسكربت
 *     هنا فقط ونعوّض بالباقي: لا سكربتات خارجية إطلاقًا، object-src 'none',
 *     base-uri/form-action/frame-ancestors مقيّدة، ولا مدخل HTML خام للزوار.
 *     (البديل الأقوى — SRI التجريبي أو nonce مع التوليد الديناميكي — مذكور في
 *     docs/SECURITY.md.)
 *
 *  ما لا يحتاجه الموقع: أي مضيف خارجي. الخطوط تُستضاف ذاتيًا عبر next/font،
 *  والصور من نفس الأصل أو data:/blob:، وGSAP مضمَّن في الحزمة.
 */

const isDev = process.env.NODE_ENV === "development";

function httpsSite(): boolean {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
}

function join(directives: (string | false | null | undefined)[]): string {
  return directives.filter(Boolean).join("; ");
}

/** التوجيهات المشتركة بين السياستين. */
function common(): string[] {
  return [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // يُفعَّل فقط عندما يُعلن الموقع https — وإلا كُسر الاختبار على http محلي
    httpsSite() && "upgrade-insecure-requests",
  ].filter((entry): entry is string => Boolean(entry));
}

/** سياسة الموقع العام (تُرسل من next.config.ts). */
export function publicCsp(): string {
  return join([
    ...common(),
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
  ]);
}

/** سياسة لوحة الإدارة (تُولَّد في proxy لكل طلب بـ nonce جديد). */
export function adminCsp(nonce: string): string {
  return join([
    ...common(),
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // سمات style="" (React style props) لا يغطيها nonce؛ الأنماط أقل خطرًا من السكربت
    "style-src 'self' 'unsafe-inline'",
  ]);
}

/** سياسة استجابات الـ API: لا تُعرض كصفحات أبدًا. */
export const API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; sandbox";
