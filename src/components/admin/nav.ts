import type { AdminIconName } from "@/components/admin/AdminIcon";

/**
 * تنقّل لوحة التحكم — مجمَّع على طريقة عمل صاحب المطبعة:
 * العمليات اليومية أولاً، ثم المحتوى، ثم الإعدادات التي تُلمس نادرًا.
 *
 * `badge` مفتاح عدّاد يُملأ من الخادم (طلبات جديدة، رسائل غير مقروءة…).
 */

export type AdminBadgeKey = "orders" | "quotes" | "messages" | "testimonials";

export type AdminNavLink = {
  label: string;
  href: string;
  icon: AdminIconName;
  badge?: AdminBadgeKey;
  /** كلمات إضافية للبحث السريع (Ctrl+K). */
  keywords?: string;
};

export type AdminNavGroup = {
  id: "ops" | "content" | "settings";
  title: string;
  links: AdminNavLink[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "ops",
    title: "العمليات",
    links: [
      { label: "لوحة المعلومات", href: "/admin", icon: "chart", keywords: "الرئيسية نظرة عامة dashboard" },
      { label: "الطلبات", href: "/admin/orders", icon: "cart", badge: "orders", keywords: "orders طلب فاتورة إنتاج" },
      { label: "عروض الأسعار", href: "/admin/quotes", icon: "document", badge: "quotes", keywords: "quotes عرض سعر تسعيرة" },
      { label: "رسائل الموقع", href: "/admin/messages", icon: "mail", badge: "messages", keywords: "messages تواصل اتصل بنا" },
      { label: "العملاء", href: "/admin/customers", icon: "users", keywords: "customers عميل" },
    ],
  },
  {
    id: "content",
    title: "المحتوى",
    links: [
      { label: "المنتجات", href: "/admin/products", icon: "package", keywords: "products متجر" },
      { label: "الأقسام", href: "/admin/categories", icon: "tag", keywords: "categories تصنيف" },
      { label: "الخدمات", href: "/admin/services", icon: "layers", keywords: "services" },
      { label: "معرض الأعمال", href: "/admin/portfolio", icon: "image", keywords: "portfolio مشاريع" },
      { label: "تصنيفات الأعمال", href: "/admin/project-categories", icon: "tag", keywords: "project categories" },
      { label: "المعدات", href: "/admin/equipment", icon: "factory", keywords: "equipment مكائن" },
      { label: "الأسئلة الشائعة", href: "/admin/faq", icon: "info", keywords: "faq" },
      { label: "تقييمات العملاء", href: "/admin/testimonials", icon: "star", badge: "testimonials", keywords: "testimonials آراء" },
      { label: "الصفحات الثابتة", href: "/admin/pages", icon: "file", keywords: "pages سياسات" },
      { label: "مكتبة الصور", href: "/admin/media", icon: "image", keywords: "media وسائط صور" },
    ],
  },
  {
    id: "settings",
    title: "الإعدادات",
    links: [
      { label: "بيانات المنشأة", href: "/admin/settings", icon: "settings", keywords: "settings رقم ضريبي تواصل" },
      { label: "تصميم الموقع", href: "/admin/theme", icon: "palette", keywords: "theme ثيم ألوان خط" },
      { label: "قالب عرض السعر", href: "/admin/quote-fields", icon: "edit", keywords: "quote fields نموذج" },
      { label: "الكوبونات والعروض", href: "/admin/coupons", icon: "gift", keywords: "coupons خصم" },
      { label: "مناطق الشحن", href: "/admin/shipping", icon: "truck", keywords: "shipping توصيل" },
      { label: "تحسين محركات البحث", href: "/admin/seo", icon: "search", keywords: "seo" },
      { label: "مستخدمو اللوحة", href: "/admin/users", icon: "shield", keywords: "users مستخدمين صلاحيات" },
    ],
  },
];

/** الأربعة الأهم تظهر في شريط الجوال السفلي. */
export const mobileTabs: AdminNavLink[] = adminNavGroups[0].links.slice(0, 4);

export type AdminQuickAction = {
  label: string;
  href: string;
  icon: AdminIconName;
  keywords?: string;
};

export const adminQuickActions: AdminQuickAction[] = [
  { label: "منتج جديد", href: "/admin/products/new", icon: "plus", keywords: "إضافة منتج" },
  { label: "خدمة جديدة", href: "/admin/services/new", icon: "plus", keywords: "إضافة خدمة" },
  { label: "عمل جديد في المعرض", href: "/admin/portfolio/new", icon: "plus", keywords: "إضافة مشروع" },
  { label: "كوبون جديد", href: "/admin/coupons/new", icon: "plus", keywords: "إضافة خصم" },
  { label: "رفع صور", href: "/admin/media", icon: "upload", keywords: "وسائط" },
  { label: "عرض الموقع", href: "/", icon: "externalLink", keywords: "الموقع العام" },
];

/** عنوان الصفحة الحالية — للشريط العلوي على الجوال. */
export function titleForPath(pathname: string): string {
  const all = adminNavGroups.flatMap((group) => group.links);
  const exact = all.find((link) => link.href === pathname);
  if (exact) return exact.label;

  const parent = all
    .filter((link) => link.href !== "/admin" && pathname.startsWith(`${link.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return parent?.label ?? "لوحة التحكم";
}
