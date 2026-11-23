import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { commerce, siteUrl } from "@/config/brand";

/** دمج أصناف Tailwind مع حلّ التعارضات. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/*
 * ملاحظة على الأرقام: المحرف `u-nu-latn` يجبر استخدام الأرقام اللاتينية
 * (0-9) بدل الأرقام العربية الشرقية (٠-٩). الأرقام الشرقية تُربك قراءة
 * الأسعار والكميات في المتاجر، والسوق السعودي يتعامل باللاتينية في التسعير.
 */
const AR_LATN = "ar-SA-u-nu-latn";

/** تنسيق رقم السعر بدون رمز العملة (الرمز يُعرض كعنصر منفصل للتحكم بحجمه). */
export function formatPrice(value: number): string {
  const hasFraction = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat(AR_LATN, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** تنسيق السعر مع رمز الريال. */
export function formatPriceWithCurrency(value: number): string {
  return `${formatPrice(value)} ${commerce.currencySymbol}`;
}

/** تنسيق عدد صحيح (كميات، إحصاءات). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(AR_LATN).format(value);
}

/** تنسيق تاريخ ميلادي بالعربية. */
export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(AR_LATN, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** تنسيق تاريخ ووقت — يُستخدم في لوحة التحكم. */
export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(AR_LATN, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * توليد slug صالح للروابط من نص عربي أو إنجليزي.
 * نُبقي الحروف العربية كما هي لأن الروابط العربية مدعومة ومفيدة للبحث المحلي،
 * ويعرضها المتصفح مقروءة رغم ترميزها كـ punycode/percent-encoding.
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, "") // إزالة التشكيل
    .replace(/[^\p{L}\p{N}]+/gu, "-") // أي فاصل غير حرف/رقم يصبح شرطة
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/**
 * فكّ ترميز slug قادم من الرابط. الراوتر يمرّر الروابط العربية مرمّزة
 * (%D9%87…) بينما تُحفظ في القاعدة كما هي، فبدون الفكّ تعطي كل صفحة
 * بـ slug عربي 404.
 */
export function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** بناء رابط مطلق — مطلوب لخريطة الموقع والبيانات المنظّمة ورسائل واتساب. */
export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** قصّ نص مع إضافة "…" — يُستخدم في أوصاف Meta. */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** حساب الضريبة بناءً على إعداد "الأسعار شاملة الضريبة". */
export function calcVat(amount: number): { net: number; vat: number; gross: number } {
  const rate = commerce.vatRate;
  if (commerce.pricesIncludeVat) {
    const net = amount / (1 + rate);
    return { net: round2(net), vat: round2(amount - net), gross: round2(amount) };
  }
  const vat = amount * rate;
  return { net: round2(amount), vat: round2(vat), gross: round2(amount + vat) };
}

/** تقريب إلى منزلتين — يتجنّب أخطاء الفاصلة العائمة في مجاميع السلة. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** سنوات الخبرة محسوبة من سنة التأسيس. */
export function yearsOfExperience(foundedYear: number): number {
  return Math.max(1, new Date().getFullYear() - foundedYear);
}

/** تحويل حجم بالبايت إلى نص مقروء. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${formatPrice(bytes / 1024)} كيلوبايت`;
  return `${formatPrice(bytes / (1024 * 1024))} ميجابايت`;
}
