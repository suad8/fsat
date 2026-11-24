import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  المحتوى المؤقت (placeholder)
 * ============================================================================
 *  القاعدة (docs/ROADMAP.md): لا نصوص وهمية ظاهرة للعميل؛ أي محتوى مؤقت يُخفى
 *  أو يُعلَّم في لوحة الإدارة فقط.
 *
 *  آليتان:
 *    ١. علامة نصية «[[يحتاج استبدال]]» داخل النص (الإعدادات القديمة والصفحات).
 *       stripPlaceholders تزيلها قبل العرض للزائر.
 *    ٢. عمود needsReview على Product / Page / ShippingZone: إشارة للإدارة فقط،
 *       يُصفَّر عند حفظ الإدارة للسجل.
 *
 *  getReviewReport تجمع الاثنين لعرض «ما يحتاج استبدالاً قبل الإطلاق» في لوحة
 *  الإدارة (المحور 2).
 * ============================================================================
 */

export const PLACEHOLDER_MARKER = "[[يحتاج استبدال]]";

/** هل النص يحمل علامة استبدال؟ */
export function hasPlaceholder(text: string | null | undefined): boolean {
  return Boolean(text && text.includes(PLACEHOLDER_MARKER));
}

/**
 * يزيل العلامة، وكل سطر تحذيري كامل بصيغة اقتباس (`> ⚠️ …`) كان يُلصق في
 * مقدّمة المسوّدات، ثم ينظّف الأسطر الفارغة المتتالية الناتجة.
 */
export function stripPlaceholders(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*>\s*⚠️/.test(line))
    .join("\n")
    .replaceAll(PLACEHOLDER_MARKER, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// تقرير «ما يحتاج مراجعة»
// ---------------------------------------------------------------------------

export type ReviewItem = {
  key: string;
  label: string;
  /** عدد العناصر المعنيّة، أو null لعنصر منفرد. */
  count: number | null;
  /** مسار صفحة الإصلاح في لوحة الإدارة. */
  href: string;
  /** blocker = يؤثر على الطلبات/التواصل الفعلي، أما recommended فتحسين. */
  severity: "blocker" | "recommended";
};

export async function getReviewReport(): Promise<ReviewItem[]> {
  const [settings, products, pages, zones, pendingTestimonials, projects, activeProducts] =
    await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
      prisma.product.count({ where: { needsReview: true } }),
      prisma.page.count({ where: { needsReview: true } }),
      prisma.shippingZone.count({ where: { needsReview: true } }),
      prisma.testimonial.count({ where: { isApproved: false } }),
      prisma.project.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true } }),
    ]);

  const items: ReviewItem[] = [];
  const missing = (value: string | null | undefined) => !value?.trim() || hasPlaceholder(value);

  const contactMissing = [settings?.phone, settings?.whatsapp, settings?.email].filter(missing).length;
  if (contactMissing > 0) {
    items.push({
      key: "contact",
      label: "بيانات التواصل (الجوال/واتساب/البريد) غير مكتملة",
      count: contactMissing,
      href: "/admin/settings",
      severity: "blocker",
    });
  }

  if (missing(settings?.addressLine)) {
    items.push({
      key: "address",
      label: "عنوان المنشأة غير مُدخل",
      count: null,
      href: "/admin/settings",
      severity: "recommended",
    });
  }

  if (missing(settings?.vatNumber) || missing(settings?.crNumber)) {
    items.push({
      key: "legal",
      label: "الرقم الضريبي أو السجل التجاري غير مُدخل",
      count: null,
      href: "/admin/settings",
      severity: "blocker",
    });
  }

  const bankReady =
    Array.isArray((settings?.paymentSettings as { bankAccounts?: unknown[] } | null)?.bankAccounts) &&
    ((settings?.paymentSettings as { bankAccounts: unknown[] }).bankAccounts.length ?? 0) > 0;
  if (!bankReady) {
    items.push({
      key: "bank",
      label: "لا يوجد حساب بنكي لاستقبال التحويلات",
      count: null,
      href: "/admin/settings",
      severity: "blocker",
    });
  }

  if (products > 0) {
    items.push({
      key: "products",
      label: "منتجات بأسعار مبدئية تنتظر مراجعتك",
      count: products,
      href: "/admin/products",
      severity: "blocker",
    });
  }
  if (zones > 0) {
    items.push({
      key: "shipping",
      label: "تكاليف شحن مبدئية تنتظر مراجعتك",
      count: zones,
      href: "/admin/shipping",
      severity: "blocker",
    });
  }
  if (pages > 0) {
    items.push({
      key: "pages",
      label: "صفحات سياسات تنتظر مراجعة قانونية",
      count: pages,
      href: "/admin/pages",
      severity: "blocker",
    });
  }
  if (pendingTestimonials > 0) {
    items.push({
      key: "testimonials",
      label: "تقييمات غير معتمدة (لا تظهر للزوّار)",
      count: pendingTestimonials,
      href: "/admin/testimonials",
      severity: "recommended",
    });
  }
  if (projects === 0) {
    items.push({
      key: "portfolio",
      label: "معرض الأعمال فارغ — أضف مشاريعك الحقيقية",
      count: null,
      href: "/admin/portfolio",
      severity: "recommended",
    });
  }
  if (activeProducts === 0) {
    items.push({
      key: "no-products",
      label: "لا توجد منتجات منشورة في المتجر",
      count: null,
      href: "/admin/products",
      severity: "blocker",
    });
  }

  return items;
}
