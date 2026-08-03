/** تعريف روابط التنقّل — مستخدم في الترويسة، قائمة الجوال، والفوتر. */

export type NavLink = {
  label: string;
  href: string;
  description?: string;
};

export type NavItem = NavLink & {
  /** قائمة منسدلة اختيارية. تُملأ ديناميكيًا للتصنيفات. */
  children?: NavLink[];
};

/** التنقّل الرئيسي في الترويسة. */
export const mainNav: NavItem[] = [
  { label: "الرئيسية", href: "/" },
  { label: "المتجر", href: "/shop", description: "تصفّح المنتجات واطلب مباشرة" },
  { label: "الخدمات", href: "/services", description: "حلول الطباعة والتجهيزات" },
  { label: "معرض الأعمال", href: "/portfolio", description: "مشاريع نفّذناها" },
  { label: "من نحن", href: "/about" },
  { label: "المعدات", href: "/equipment", description: "مكائن وتقنيات الطباعة" },
  { label: "اتصل بنا", href: "/contact" },
];

/** روابط الفوتر — مجمّعة في أعمدة. */
export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "الشركة",
    links: [
      { label: "من نحن", href: "/about" },
      { label: "معدات وتقنيات الطباعة", href: "/equipment" },
      { label: "معرض الأعمال", href: "/portfolio" },
      { label: "الأسئلة الشائعة", href: "/faq" },
      { label: "اتصل بنا", href: "/contact" },
    ],
  },
  {
    title: "التسوّق",
    links: [
      { label: "المتجر", href: "/shop" },
      { label: "الخدمات", href: "/services" },
      { label: "طلب عرض سعر", href: "/quote" },
      { label: "السلة", href: "/cart" },
    ],
  },
  {
    title: "السياسات",
    links: [
      { label: "سياسة الخصوصية", href: "/policies/privacy" },
      { label: "الشروط والأحكام", href: "/policies/terms" },
      { label: "الاستبدال والاسترجاع", href: "/policies/returns" },
      { label: "الشحن والتوصيل", href: "/policies/shipping" },
    ],
  },
];

/** تنقّل لوحة التحكم. */
export const adminNav: { title: string; links: NavLink[] }[] = [
  {
    title: "نظرة عامة",
    links: [{ label: "لوحة المعلومات", href: "/admin" }],
  },
  {
    title: "المتجر",
    links: [
      { label: "المنتجات", href: "/admin/products" },
      { label: "الأقسام", href: "/admin/categories" },
      { label: "الطلبات", href: "/admin/orders" },
      { label: "طلبات عروض الأسعار", href: "/admin/quotes" },
      { label: "قالب عرض السعر", href: "/admin/quote-fields" },
      { label: "العملاء", href: "/admin/customers" },
      { label: "العروض والكوبونات", href: "/admin/coupons" },
    ],
  },
  {
    title: "المحتوى",
    links: [
      { label: "معرض الأعمال", href: "/admin/portfolio" },
      { label: "الخدمات", href: "/admin/services" },
      { label: "المعدات", href: "/admin/equipment" },
      { label: "الأسئلة الشائعة", href: "/admin/faq" },
      { label: "تقييمات العملاء", href: "/admin/testimonials" },
      { label: "الصفحات", href: "/admin/pages" },
      { label: "مكتبة الصور", href: "/admin/media" },
    ],
  },
  {
    title: "الإعدادات",
    links: [
      { label: "تصميم الموقع", href: "/admin/theme" },
      { label: "رسائل الموقع", href: "/admin/messages" },
      { label: "الشحن", href: "/admin/shipping" },
      { label: "تحسين محركات البحث", href: "/admin/seo" },
      { label: "بيانات المنشأة", href: "/admin/settings" },
    ],
  },
];
