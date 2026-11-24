/**
 * أدوات الجوال والحقول — آمنة للعميل والخادم معًا (بلا اعتماد على Prisma).
 *
 * لماذا ملف مستقل: التحقق الفوري في النموذج يجب أن يعطي العميل عبارات بشرية
 * («يبدأ الرقم بـ 05») لا رسائل المخطط العامة، ويقبل الأرقام العربية (٠٥٠…)
 * التي تكتبها لوحة المفاتيح العربية، بينما يتحقق الخادم دائمًا بمخطط zod.
 */

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

/** يحوّل الأرقام العربية/الفارسية إلى لاتينية. */
export function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (char) => {
    const arabic = ARABIC_INDIC.indexOf(char);
    if (arabic >= 0) return String(arabic);
    return String(PERSIAN.indexOf(char));
  });
}

/** يُبقي الأرقام فقط (بعد التحويل للاتينية). */
export function digitsOnly(value: string): string {
  return toLatinDigits(value).replace(/\D/g, "");
}

/**
 * يوحّد رقم الجوال السعودي إلى الصيغة 9665XXXXXXXX، أو null إن لم يصحّ.
 * يقبل: 05XXXXXXXX و5XXXXXXXX و+9665XXXXXXXX و009665XXXXXXXX.
 */
export function normalizeSaudiPhone(raw: string): string | null {
  const compact = toLatinDigits(raw).replace(/[\s\-()+]/g, "");
  if (!/^(?:966|00966|0)?5\d{8}$/.test(compact)) return null;
  return `966${compact.slice(-9)}`;
}

/** يعرض الرقم المخزّن بصيغة محلية: 05X XXX XXXX */
export function formatLocalPhone(stored: string): string {
  const digits = digitsOnly(stored);
  const local = digits.length >= 9 ? `0${digits.slice(-9)}` : digits;
  if (local.length !== 10) return stored;
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/** رسالة خطأ بشرية للجوال، أو null إن كان صحيحًا. */
export function phoneError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "اكتب رقم جوالك ليصلك تأكيد الطلب.";

  const compact = toLatinDigits(value).replace(/[\s\-()+]/g, "");
  if (/\D/.test(compact)) return "رقم الجوال أرقام فقط — مثال: 0512345678";

  const local = compact.replace(/^(?:00966|966)/, "0");
  if (!local.startsWith("05") && !local.startsWith("5")) {
    return "يبدأ الجوال السعودي بـ 05 — مثال: 0512345678";
  }
  if (normalizeSaudiPhone(value) === null) {
    const length = local.startsWith("0") ? local.length : local.length + 1;
    return length < 10
      ? "الرقم ناقص — الجوال السعودي 10 أرقام، مثال: 0512345678"
      : "الرقم زائد — الجوال السعودي 10 أرقام، مثال: 0512345678";
  }
  return null;
}

export function nameError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "اكتب اسمك لنعرف باسم من نجهّز الطلب.";
  if (value.length < 2) return "الاسم قصير — اكتب حرفين على الأقل.";
  if (value.length > 80) return "الاسم طويل — اختصره قليلًا.";
  return null;
}

export function emailError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return "البريد غير مكتمل — مثال: name@example.com";
  }
  return null;
}

export function addressError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "اكتب عنوان التوصيل: الحي والشارع وأقرب معلم.";
  if (value.length < 5) return "العنوان قصير — أضف الحي والشارع ليصل المندوب بسهولة.";
  if (value.length > 240) return "العنوان طويل — اختصره في سطر أو سطرين.";
  return null;
}

/** رقم الطلب بصيغة موحّدة: ORD-2026-0043 (يقبل الأرقام العربية والمسافات). */
export function normalizeOrderNumber(raw: string): string {
  const cleaned = toLatinDigits(raw).toUpperCase().replace(/[\s_]+/g, "");
  const match = cleaned.match(/^ORD-?(\d{4})-?(\d{3,6})$/);
  if (match) return `ORD-${match[1]}-${match[2]}`;
  return cleaned;
}

export function orderNumberError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "اكتب رقم الطلب كما ظهر لك بعد الإرسال.";
  if (!/^ORD-\d{4}-\d{3,6}$/.test(normalizeOrderNumber(value))) {
    return "رقم الطلب بهذه الصيغة: ORD-2026-0043";
  }
  return null;
}
