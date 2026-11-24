import { toLatinDigits } from "@/lib/shop/phone";

/**
 * بحث عربي متسامح — آمن للعميل والخادم.
 *
 * قاعدة البيانات (SQLite LIKE) لا تعرف أن «اكواب» هي «أكواب» ولا أن «مطبعة»
 * تطابق «مطبعه»، فيخرج العميل من البحث بلا نتائج مع أن المنتج موجود. هنا
 * نوحّد الهمزات والتاء المربوطة والألف المقصورة والتشكيل وأداة التعريف قبل
 * المقارنة.
 */

export function normalizeArabic(value: string): string {
  return toLatinDigits(value)
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "") // تشكيل + تطويل
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** كلمات البحث بعد التطبيع، مع حذف «ال» التعريف من أول الكلمة الطويلة. */
export function tokenize(value: string): string[] {
  return normalizeArabic(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => (word.length > 3 && word.startsWith("ال") ? word.slice(2) : word));
}

export type Searchable = {
  /** الحقل الأهم — يرفع الترتيب عند التطابق. */
  title: string;
  /** نصوص إضافية: وصف مختصر، اسم القسم… */
  extra?: string[];
};

/**
 * درجة التطابق: 0 = لا تطابق. كل كلمات البحث يجب أن توجد في أحد الحقول.
 * الأعلى = أفضل: بداية العنوان > وجود في العنوان > وجود في النصوص الإضافية.
 */
export function scoreMatch(item: Searchable, tokens: string[]): number {
  if (tokens.length === 0) return 0;

  const titleWords = tokenize(item.title);
  const title = titleWords.join(" ");
  const extra = (item.extra ?? []).map((text) => tokenize(text).join(" ")).join(" ");

  let score = 0;
  for (const token of tokens) {
    if (titleWords.some((word) => word.startsWith(token))) score += title.startsWith(token) ? 6 : 4;
    else if (title.includes(token)) score += 3;
    else if (extra.includes(token)) score += 1;
    else return 0;
  }
  return score;
}

/** يُبقي العناصر المطابقة فقط بترتيبها الأصلي (يحترم ترتيب العميل بالسعر). */
export function filterItems<T>(items: T[], query: string, pick: (item: T) => Searchable): T[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return items;
  return items.filter((item) => scoreMatch(pick(item), tokens) > 0);
}

/** يفلتر ويرتّب عناصر حسب الصلة؛ استعلام فارغ يعيد العناصر كما هي. */
export function searchItems<T>(
  items: T[],
  query: string,
  pick: (item: T) => Searchable,
): T[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return items;

  return items
    .map((item, index) => ({ item, index, score: scoreMatch(pick(item), tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
