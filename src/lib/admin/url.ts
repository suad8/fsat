/**
 * أدوات روابط القوائم: تبني رابطًا يحافظ على الفلاتر الحالية ويغيّر ما يلزم فقط.
 * تُستعمل في الخادم (روابط الفلاتر والصفحات) وفي العميل (شريط البحث).
 */

export type ParamBag = Record<string, string | undefined>;

/** رابط جديد = الحالي + التعديلات. القيمة undefined/"" تحذف المفتاح. */
export function hrefWith(
  base: string,
  current: ParamBag,
  patch: ParamBag,
  options: { resetPage?: boolean } = {},
): string {
  const next: ParamBag = { ...current, ...patch };
  if (options.resetPage !== false && !("page" in patch)) delete next.page;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value !== undefined && value !== "") query.set(key, value);
  }

  const text = query.toString();
  return text ? `${base}?${text}` : base;
}

/** يأخذ أول قيمة نصية من معامل بحث قد يكون مصفوفة. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/** رقم صفحة آمن ≥ 1. */
export function pageParam(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(firstParam(value) ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 10_000) : 1;
}

/** يحوّل الأرقام الهندية/الفارسية إلى لاتينية ليعمل البحث بأي لوحة مفاتيح. */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}
