/**
 * تسلسل JSON آمن للحقن داخل <script type="application/ld+json">.
 *
 * JSON.stringify وحده لا يكفي: قيمة تحتوي `</script><script>…` تُغلق وسم السكربت
 * وتحقن آخر (XSS). نهرّب `<` و `>` و `&` ومحارف فاصل الأسطر Unicode — والناتج يبقى
 * JSON صالحًا يقرؤه محرك البحث كما هو.
 *
 *   <script type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
