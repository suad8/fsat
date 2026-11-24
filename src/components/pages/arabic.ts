/**
 * أدوات نص عربي للبحث والمطابقة.
 *
 * البحث العربي يفشل لأسباب شكلية: «أ/إ/ا» و«ة/ه» و«ى/ي» والتشكيل والأرقام
 * الشرقية. توحيدها قبل المقارنة يجعل «مدّة» تطابق «مده» و«البوكسات» تطابق
 * «بوكسات».
 */
export function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[ً-ٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/** يحوّل الأرقام الشرقية إلى لاتينية — لاستخراج أرقام من نصوص مثل «٥ – ٨ أيام». */
export function toLatinDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

const GENERIC = new Set(["طباعه", "خدمه", "حسب", "الطلب", "المنتجات", "منتجات"]);

/** كلمات مفتاحية من عنوان الخدمة، بلا «ال» و«وال» والكلمات العامة. */
export function keywordsOf(title: string): string[] {
  return normalizeArabic(title)
    .split(" ")
    .map((word) => word.replace(/^(وال|بال|لل|ال|و)/, ""))
    .filter((word) => word.length > 3 && !GENERIC.has(word));
}

/** يلخّص مدد التنفيذ من نصوص مثل «٥ – ٨ أيام عمل» إلى مدى واحد، أو null إن تعذّر. */
export function summarizeLeadTimes(values: (string | null | undefined)[]): string | null {
  const present = values.filter((value): value is string => Boolean(value && value.trim()));
  if (present.length === 0) return null;

  const unique = [...new Set(present.map((value) => value.trim()))];
  if (unique.length === 1) return unique[0];

  const numbers: number[] = [];
  for (const value of unique) {
    const found = toLatinDigits(value).match(/\d+/g);
    if (!found || !/يوم|أيام|ايام/.test(value)) return null;
    numbers.push(...found.map(Number));
  }

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const result = min === max ? `${min} أيام عمل` : `${min} – ${max} يوم عمل`;

  // نحافظ على نمط الأرقام الذي كتبته الإدارة (شرقية أو لاتينية) ليتّسق مع بطاقات المنتجات
  return /[٠-٩]/.test(unique[0])
    ? result.replace(/\d/g, (digit) => String.fromCharCode(0x0660 + Number(digit)))
    : result;
}
