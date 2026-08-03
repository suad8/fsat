/**
 * الثوابت المشتركة بين قاعدة البيانات والواجهة ولوحة التحكم.
 *
 * SQLite لا يدعم enum، فهذه الثوابت هي المرجع الوحيد للقيم المسموحة،
 * وتُستخدم في مخططات Zod وفي قوائم لوحة التحكم وفي عرض التسميات العربية.
 */

// ---------------------------------------------------------------------------
// التسعير
// ---------------------------------------------------------------------------

export const PRICE_MODES = ["FIXED", "STARTS_FROM", "QUOTE_ONLY"] as const;
export type PriceMode = (typeof PRICE_MODES)[number];

export const PRICE_MODE_LABELS: Record<PriceMode, string> = {
  FIXED: "سعر ثابت",
  STARTS_FROM: "يبدأ من",
  QUOTE_ONLY: "عرض سعر فقط",
};

export const OPTION_PRICE_MODES = [
  "ADD",
  "ADD_PER_UNIT",
  "MULTIPLY",
  "OVERRIDE_UNIT",
] as const;
export type OptionPriceMode = (typeof OPTION_PRICE_MODES)[number];

export const OPTION_PRICE_MODE_LABELS: Record<OptionPriceMode, string> = {
  ADD: "يُضاف مرة واحدة للطلب",
  ADD_PER_UNIT: "يُضاف لسعر كل وحدة",
  MULTIPLY: "يضرب سعر الوحدة",
  OVERRIDE_UNIT: "يستبدل سعر الوحدة",
};

// ---------------------------------------------------------------------------
// خيارات المنتجات
// ---------------------------------------------------------------------------

export const OPTION_TYPES = [
  "SELECT",
  "RADIO",
  "COLOR",
  "NUMBER",
  "TEXT",
  "TEXTAREA",
  "CHECKBOX",
  "FILE",
  "DATE",
] as const;
export type OptionType = (typeof OPTION_TYPES)[number];

export const OPTION_TYPE_LABELS: Record<OptionType, string> = {
  SELECT: "قائمة منسدلة",
  RADIO: "اختيار واحد",
  COLOR: "عيّنات ألوان",
  NUMBER: "رقم",
  TEXT: "نص قصير",
  TEXTAREA: "نص طويل",
  CHECKBOX: "خيارات متعددة",
  FILE: "رفع ملف",
  DATE: "تاريخ",
};

/** أنواع الخيارات التي تعتمد على قائمة قيم معرّفة مسبقًا. */
export const CHOICE_OPTION_TYPES: readonly OptionType[] = [
  "SELECT",
  "RADIO",
  "COLOR",
  "CHECKBOX",
];

// ---------------------------------------------------------------------------
// الطلبات
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "جديد",
  CONFIRMED: "مؤكّد",
  IN_PRODUCTION: "قيد التنفيذ",
  READY: "جاهز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغى",
};

/** أصناف Tailwind لشارة كل حالة — تُستخدم في لوحة التحكم. */
export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  NEW: "bg-info-50 text-info-700 ring-info-500/20",
  CONFIRMED: "bg-info-50 text-info-700 ring-info-500/20",
  IN_PRODUCTION: "bg-warning-50 text-warning-700 ring-warning-500/20",
  READY: "bg-accent-50 text-accent-700 ring-accent-500/20",
  SHIPPED: "bg-accent-50 text-accent-700 ring-accent-500/20",
  DELIVERED: "bg-success-50 text-success-700 ring-success-500/20",
  CANCELLED: "bg-danger-50 text-danger-700 ring-danger-500/20",
};

export const PAYMENT_METHODS = [
  "BANK_TRANSFER",
  "ONLINE",
  "COD",
  "ON_PICKUP",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "تحويل بنكي",
  ONLINE: "دفع إلكتروني",
  COD: "الدفع عند الاستلام",
  ON_PICKUP: "الدفع عند الاستلام من الفرع",
};

export const PAYMENT_METHOD_DESCRIPTIONS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "نرسل لك بيانات الحساب البنكي بعد تأكيد الطلب، وترفق إيصال التحويل.",
  ONLINE: "الدفع بالبطاقة عبر بوابة دفع آمنة.",
  COD: "تدفع نقدًا أو بالشبكة عند استلام الطلب.",
  ON_PICKUP: "تدفع عند استلام الطلب من مقر الشركة.",
};

export const PAYMENT_STATUSES = ["PENDING", "PAID", "REFUNDED", "FAILED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "بانتظار الدفع",
  PAID: "مدفوع",
  REFUNDED: "مسترجع",
  FAILED: "فشل الدفع",
};

export const FULFILLMENT_METHODS = ["PICKUP", "DELIVERY"] as const;
export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number];

export const FULFILLMENT_LABELS: Record<FulfillmentMethod, string> = {
  PICKUP: "الاستلام من الفرع",
  DELIVERY: "التوصيل والشحن",
};

// ---------------------------------------------------------------------------
// عروض الأسعار
// ---------------------------------------------------------------------------

export const QUOTE_STATUSES = ["NEW", "IN_REVIEW", "QUOTED", "WON", "LOST"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  NEW: "جديد",
  IN_REVIEW: "قيد المراجعة",
  QUOTED: "تم إرسال العرض",
  WON: "تحوّل إلى طلب",
  LOST: "لم يكتمل",
};

export const QUOTE_STATUS_TONE: Record<QuoteStatus, string> = {
  NEW: "bg-info-50 text-info-700 ring-info-500/20",
  IN_REVIEW: "bg-warning-50 text-warning-700 ring-warning-500/20",
  QUOTED: "bg-accent-50 text-accent-700 ring-accent-500/20",
  WON: "bg-success-50 text-success-700 ring-success-500/20",
  LOST: "bg-primary-100 text-primary-600 ring-primary-500/20",
};

export const CONTACT_PREFERENCES = ["WHATSAPP", "PHONE", "EMAIL"] as const;
export type ContactPreference = (typeof CONTACT_PREFERENCES)[number];

export const CONTACT_PREFERENCE_LABELS: Record<ContactPreference, string> = {
  WHATSAPP: "واتساب",
  PHONE: "اتصال هاتفي",
  EMAIL: "البريد الإلكتروني",
};

// ---------------------------------------------------------------------------
// الرسائل ومراحل صور المشاريع
// ---------------------------------------------------------------------------

export const MESSAGE_STATUSES = ["NEW", "READ", "REPLIED", "ARCHIVED"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  NEW: "جديدة",
  READ: "مقروءة",
  REPLIED: "تم الرد",
  ARCHIVED: "مؤرشفة",
};

export const PROJECT_IMAGE_STAGES = ["RESULT", "BEFORE", "AFTER", "PROCESS"] as const;
export type ProjectImageStage = (typeof PROJECT_IMAGE_STAGES)[number];

export const PROJECT_IMAGE_STAGE_LABELS: Record<ProjectImageStage, string> = {
  RESULT: "النتيجة النهائية",
  BEFORE: "قبل",
  AFTER: "بعد",
  PROCESS: "مرحلة تنفيذ",
};

// ---------------------------------------------------------------------------
// المستخدمون
// ---------------------------------------------------------------------------

export const ADMIN_ROLES = ["OWNER", "ADMIN", "EDITOR"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  OWNER: "المالك",
  ADMIN: "مدير",
  EDITOR: "محرّر",
};

// ---------------------------------------------------------------------------
// رفع الملفات
// ---------------------------------------------------------------------------

/** أنواع الصور المسموح رفعها — يُعاد ترميزها عبر sharp قبل الحفظ. */
export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/** ملفات التصاميم التي يرفعها العملاء — تُحفظ خارج public ولا تُعرض علنًا. */
export const ALLOWED_DESIGN_MIME = [
  "application/pdf",
  "application/postscript", // ai, eps
  "image/vnd.adobe.photoshop",
  "application/zip",
  "application/x-zip-compressed",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // ٨ ميجابايت
export const MAX_DESIGN_SIZE = 25 * 1024 * 1024; // ٢٥ ميجابايت
export const MAX_FILES_PER_REQUEST = 5;

// ---------------------------------------------------------------------------
// مدن الشحن الافتراضية — تُدار لاحقًا من لوحة التحكم (مناطق الشحن)
// ---------------------------------------------------------------------------

export const SAUDI_CITIES = [
  "الرياض",
  "جدة",
  "مكة المكرمة",
  "المدينة المنورة",
  "الدمام",
  "الخبر",
  "الظهران",
  "الأحساء",
  "الجبيل",
  "الطائف",
  "بريدة",
  "عنيزة",
  "حائل",
  "تبوك",
  "أبها",
  "خميس مشيط",
  "نجران",
  "جازان",
  "الباحة",
  "سكاكا",
  "عرعر",
  "ينبع",
  "القطيف",
  "الخرج",
] as const;
