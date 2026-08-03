import {
  ADMIN_ROLES,
  OPTION_TYPES,
  PROJECT_IMAGE_STAGES,
  SAUDI_CITIES,
} from "@/lib/constants";

/**
 * ============================================================================
 *  تعريف موارد لوحة التحكم
 * ============================================================================
 *  الكيانات البسيطة (الأسئلة الشائعة، المعدات، التقييمات، الصفحات، الكوبونات،
 *  مناطق الشحن، التصنيفات) تشترك في نفس نمط الإدارة: جدول + نموذج حقول.
 *  تعريفها كبيانات هنا بدل كتابة صفحة لكل واحدة يعني أن إضافة حقل جديد
 *  تتم في سطر واحد، وأن كل الشاشات تبقى متسقة تلقائيًا.
 *
 *  الكيانات المعقّدة (المنتجات، الطلبات، عروض الأسعار، الأعمال، الخدمات)
 *  لها شاشات مخصّصة لأن لها علاقات متداخلة ومنطق خاص.
 * ============================================================================
 */

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "price"
  | "checkbox"
  | "select"
  | "multiselect"
  | "date"
  | "image"
  | "color"
  | "keyValue";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: readonly { value: string; label: string }[];
  /** يمتد على عمودي الشبكة في النموذج. */
  wide?: boolean;
  /** القيمة الابتدائية عند الإنشاء. */
  defaultValue?: string | number | boolean;
};

export type ColumnDef = {
  name: string;
  label: string;
  /** طريقة العرض في الجدول. */
  render?: "text" | "boolean" | "price" | "date" | "badge" | "image" | "number";
  className?: string;
};

export type ResourceDef = {
  /** اسم النموذج في Prisma — من قائمة مغلقة معرّفة هنا فقط. */
  model: string;
  /** المسار تحت /admin */
  slug: string;
  title: string;
  singular: string;
  description: string;
  icon: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  /** ترتيب القائمة الافتراضي. */
  orderBy: Record<string, "asc" | "desc">[];
  /** حقول يُبحث فيها. */
  searchFields?: string[];
};

const seoFields: FieldDef[] = [
  {
    name: "seoTitle",
    label: "عنوان الصفحة (SEO)",
    type: "text",
    help: "يظهر في نتائج البحث وفي تبويب المتصفّح. اتركه فارغًا لاستخدام العنوان الأساسي.",
  },
  {
    name: "seoDescription",
    label: "وصف الصفحة (SEO)",
    type: "textarea",
    help: "١٥٠ – ١٦٠ حرفًا تصف الصفحة وتظهر تحت العنوان في نتائج البحث.",
    wide: true,
  },
];

const orderField: FieldDef = {
  name: "order",
  label: "ترتيب العرض",
  type: "number",
  help: "الأصغر يظهر أولاً.",
  defaultValue: 0,
};

const activeField: FieldDef = {
  name: "isActive",
  label: "منشور في الموقع",
  type: "checkbox",
  defaultValue: true,
};

export const RESOURCES: Record<string, ResourceDef> = {
  categories: {
    model: "category",
    slug: "categories",
    title: "أقسام المنتجات",
    singular: "قسم",
    description: "أقسام المتجر التي تُصنَّف تحتها المنتجات.",
    icon: "tag",
    orderBy: [{ order: "asc" }, { name: "asc" }],
    searchFields: ["name", "slug"],
    columns: [
      { name: "imageUrl", label: "الصورة", render: "image" },
      { name: "name", label: "اسم القسم" },
      { name: "slug", label: "الرابط" },
      { name: "order", label: "الترتيب", render: "number" },
      { name: "isActive", label: "منشور", render: "boolean" },
    ],
    fields: [
      { name: "name", label: "اسم القسم", type: "text", required: true },
      {
        name: "slug",
        label: "الرابط (slug)",
        type: "text",
        required: true,
        help: "يظهر في عنوان الصفحة: /shop/الرابط — استخدم حروفًا إنجليزية وشرطات.",
        placeholder: "boxes-packaging",
      },
      { name: "description", label: "وصف القسم", type: "textarea", wide: true },
      { name: "imageUrl", label: "صورة القسم", type: "image" },
      {
        name: "imageAlt",
        label: "النص البديل للصورة",
        type: "text",
        help: "وصف مختصر لمحتوى الصورة — مهم لإمكانية الوصول ومحركات البحث.",
      },
      {
        name: "iconKey",
        label: "مفتاح الأيقونة",
        type: "select",
        help: "الأيقونة المعروضة عند غياب الصورة.",
        options: [
          { value: "box", label: "صندوق" },
          { value: "cup", label: "كوب" },
          { value: "document", label: "مستند" },
          { value: "sticker", label: "استيكر" },
          { value: "layers", label: "طبقات" },
          { value: "sign", label: "لوحة" },
          { value: "banner", label: "بنر" },
          { value: "shirt", label: "قميص" },
          { value: "gift", label: "هدية" },
          { value: "package", label: "طرد" },
          { value: "sparkles", label: "بريق" },
          { value: "pen", label: "قلم" },
        ],
      },
      orderField,
      activeField,
      ...seoFields,
    ],
  },

  "project-categories": {
    model: "projectCategory",
    slug: "project-categories",
    title: "تصنيفات معرض الأعمال",
    singular: "تصنيف",
    description: "التصنيفات التي تُفلتر بها الأعمال في المعرض.",
    icon: "image",
    orderBy: [{ order: "asc" }, { name: "asc" }],
    searchFields: ["name", "slug"],
    columns: [
      { name: "name", label: "اسم التصنيف" },
      { name: "slug", label: "الرابط" },
      { name: "order", label: "الترتيب", render: "number" },
      { name: "isActive", label: "منشور", render: "boolean" },
    ],
    fields: [
      { name: "name", label: "اسم التصنيف", type: "text", required: true },
      {
        name: "slug",
        label: "الرابط (slug)",
        type: "text",
        required: true,
        placeholder: "boxes",
      },
      orderField,
      activeField,
    ],
  },

  equipment: {
    model: "equipment",
    slug: "equipment",
    title: "المعدات والمكائن",
    singular: "ماكينة",
    description: "المكائن والتقنيات المعروضة في صفحة معدات الطباعة.",
    icon: "settings",
    orderBy: [{ order: "asc" }, { name: "asc" }],
    searchFields: ["name", "model"],
    columns: [
      { name: "imageUrl", label: "الصورة", render: "image" },
      { name: "name", label: "اسم الماكينة" },
      { name: "model", label: "الموديل" },
      { name: "order", label: "الترتيب", render: "number" },
      { name: "isActive", label: "منشور", render: "boolean" },
    ],
    fields: [
      { name: "name", label: "اسم الماكينة", type: "text", required: true },
      { name: "model", label: "الموديل", type: "text" },
      { name: "description", label: "الوصف", type: "textarea", wide: true },
      { name: "imageUrl", label: "صورة الماكينة", type: "image" },
      { name: "imageAlt", label: "النص البديل للصورة", type: "text" },
      {
        name: "specs",
        label: "المواصفات الفنية",
        type: "keyValue",
        help: "أضف كل مواصفة كسطر: الاسم ثم القيمة — مثال: عرض الطباعة / ٣٢٠ سم.",
        wide: true,
      },
      orderField,
      activeField,
    ],
  },

  faq: {
    model: "faq",
    slug: "faq",
    title: "الأسئلة الشائعة",
    singular: "سؤال",
    description: "الأسئلة والإجابات المعروضة في صفحة الأسئلة الشائعة.",
    icon: "info",
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    searchFields: ["question", "answer"],
    columns: [
      { name: "question", label: "السؤال" },
      { name: "category", label: "التصنيف" },
      { name: "order", label: "الترتيب", render: "number" },
      { name: "isActive", label: "منشور", render: "boolean" },
    ],
    fields: [
      { name: "question", label: "السؤال", type: "text", required: true, wide: true },
      { name: "answer", label: "الإجابة", type: "textarea", required: true, wide: true },
      {
        name: "category",
        label: "التصنيف",
        type: "text",
        help: "يجمع الأسئلة تحت عنوان واحد — مثال: الطلب، الشحن، الدفع.",
      },
      orderField,
      activeField,
    ],
  },

  testimonials: {
    model: "testimonial",
    slug: "testimonials",
    title: "تقييمات العملاء",
    singular: "تقييم",
    description:
      "لا يظهر أي تقييم في الموقع قبل اعتماده — تأكّد أن التقييم حقيقي قبل نشره.",
    icon: "star",
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    searchFields: ["authorName", "companyName", "content"],
    columns: [
      { name: "authorName", label: "اسم العميل" },
      { name: "companyName", label: "المنشأة" },
      { name: "rating", label: "التقييم", render: "number" },
      { name: "isApproved", label: "معتمد", render: "boolean" },
      { name: "isFeatured", label: "مميّز", render: "boolean" },
    ],
    fields: [
      { name: "authorName", label: "اسم العميل", type: "text", required: true },
      { name: "authorTitle", label: "المسمّى الوظيفي", type: "text" },
      { name: "companyName", label: "اسم المنشأة", type: "text" },
      {
        name: "city",
        label: "المدينة",
        type: "select",
        options: SAUDI_CITIES.map((city) => ({ value: city, label: city })),
      },
      {
        name: "rating",
        label: "التقييم (من ٥)",
        type: "number",
        defaultValue: 5,
        required: true,
      },
      { name: "content", label: "نص التقييم", type: "textarea", required: true, wide: true },
      { name: "imageUrl", label: "صورة العميل أو شعار المنشأة", type: "image" },
      {
        name: "isApproved",
        label: "معتمد للنشر",
        type: "checkbox",
        help: "لن يظهر التقييم في الموقع قبل تفعيل هذا الخيار.",
        defaultValue: false,
      },
      { name: "isFeatured", label: "مميّز (يظهر أولاً)", type: "checkbox", defaultValue: false },
      orderField,
    ],
  },

  pages: {
    model: "page",
    slug: "pages",
    title: "الصفحات الثابتة",
    singular: "صفحة",
    description: "صفحات السياسات والمحتوى التعريفي القابلة للتحرير.",
    icon: "file",
    orderBy: [{ updatedAt: "desc" }],
    searchFields: ["title", "slug"],
    columns: [
      { name: "title", label: "عنوان الصفحة" },
      { name: "slug", label: "الرابط" },
      { name: "updatedAt", label: "آخر تحديث", render: "date" },
      { name: "isActive", label: "منشور", render: "boolean" },
    ],
    fields: [
      { name: "title", label: "عنوان الصفحة", type: "text", required: true },
      {
        name: "slug",
        label: "الرابط (slug)",
        type: "text",
        required: true,
        help: "صفحات السياسات تستخدم: privacy، terms، returns، shipping",
      },
      {
        name: "content",
        label: "المحتوى",
        type: "markdown",
        required: true,
        wide: true,
        help: "يدعم: ## عنوان، **عريض**، - قائمة، > اقتباس، وجداول.",
      },
      activeField,
      ...seoFields,
    ],
  },

  coupons: {
    model: "coupon",
    slug: "coupons",
    title: "العروض والكوبونات",
    singular: "كوبون",
    description: "رموز الخصم التي يمكن للعملاء استخدامها عند إتمام الطلب.",
    icon: "tag",
    orderBy: [{ createdAt: "desc" }],
    searchFields: ["code", "description"],
    columns: [
      { name: "code", label: "الرمز" },
      { name: "type", label: "النوع", render: "badge" },
      { name: "value", label: "القيمة", render: "number" },
      { name: "usedCount", label: "مرات الاستخدام", render: "number" },
      { name: "expiresAt", label: "ينتهي في", render: "date" },
      { name: "isActive", label: "مفعّل", render: "boolean" },
    ],
    fields: [
      {
        name: "code",
        label: "رمز الخصم",
        type: "text",
        required: true,
        help: "حروف إنجليزية كبيرة وأرقام — مثال: WELCOME10",
        placeholder: "WELCOME10",
      },
      { name: "description", label: "وصف العرض", type: "text", wide: true },
      {
        name: "type",
        label: "نوع الخصم",
        type: "select",
        required: true,
        defaultValue: "PERCENT",
        options: [
          { value: "PERCENT", label: "نسبة مئوية (٪)" },
          { value: "FIXED", label: "مبلغ ثابت (ريال)" },
        ],
      },
      {
        name: "value",
        label: "قيمة الخصم",
        type: "number",
        required: true,
        help: "للنسبة المئوية أدخل الرقم بدون علامة ٪ — مثال: 10",
      },
      { name: "minOrderAmount", label: "الحد الأدنى للطلب (ريال)", type: "price" },
      {
        name: "maxUses",
        label: "أقصى عدد استخدامات",
        type: "number",
        help: "اتركه فارغًا لعدد غير محدود.",
      },
      { name: "startsAt", label: "يبدأ في", type: "date" },
      { name: "expiresAt", label: "ينتهي في", type: "date" },
      { name: "isActive", label: "مفعّل", type: "checkbox", defaultValue: true },
    ],
  },

  shipping: {
    model: "shippingZone",
    slug: "shipping",
    title: "مناطق الشحن",
    singular: "منطقة شحن",
    description: "تكلفة الشحن ومدته حسب مجموعات المدن.",
    icon: "truck",
    orderBy: [{ order: "asc" }],
    searchFields: ["name"],
    columns: [
      { name: "name", label: "اسم المنطقة" },
      { name: "cost", label: "التكلفة", render: "price" },
      { name: "freeOverAmount", label: "شحن مجاني فوق", render: "price" },
      { name: "estimatedDays", label: "المدة" },
      { name: "isActive", label: "مفعّلة", render: "boolean" },
    ],
    fields: [
      { name: "name", label: "اسم المنطقة", type: "text", required: true },
      {
        name: "cities",
        label: "المدن المشمولة",
        type: "multiselect",
        required: true,
        wide: true,
        options: SAUDI_CITIES.map((city) => ({ value: city, label: city })),
        help: "المدن غير المضافة لأي منطقة تُحتسب بأعلى تكلفة معرّفة.",
      },
      { name: "cost", label: "تكلفة الشحن (ريال)", type: "price", required: true },
      {
        name: "freeOverAmount",
        label: "شحن مجاني فوق (ريال)",
        type: "price",
        help: "اتركه فارغًا إن لم يكن هناك شحن مجاني.",
      },
      {
        name: "estimatedDays",
        label: "المدة التقديرية",
        type: "text",
        placeholder: "٢ – ٤ أيام عمل",
      },
      orderField,
      { name: "isActive", label: "مفعّلة", type: "checkbox", defaultValue: true },
    ],
  },

  "quote-fields": {
    model: "quoteFormField",
    slug: "quote-fields",
    title: "قالب نموذج عرض السعر",
    singular: "حقل",
    description:
      "تحكّم كامل في حقول نموذج طلب عرض السعر: أضف حقولاً، أعد تسميتها، اجعلها إلزامية، أخفِها، أو أعد ترتيبها — دون أي تعديل في الكود.",
    icon: "document",
    orderBy: [{ order: "asc" }],
    searchFields: ["label", "key"],
    columns: [
      { name: "label", label: "اسم الحقل" },
      { name: "key", label: "المفتاح" },
      { name: "type", label: "النوع", render: "badge" },
      { name: "isRequired", label: "إلزامي", render: "boolean" },
      { name: "isActive", label: "ظاهر", render: "boolean" },
      { name: "order", label: "الترتيب", render: "number" },
    ],
    fields: [
      {
        name: "label",
        label: "اسم الحقل كما يراه العميل",
        type: "text",
        required: true,
        placeholder: "عدد الألوان المطلوبة",
      },
      {
        name: "key",
        label: "المفتاح",
        type: "text",
        required: true,
        help: "معرّف ثابت بالإنجليزية يُخزَّن مع الإجابة — لا تغيّره بعد وصول طلبات، وإلا انفصلت الإجابات القديمة عن الحقل.",
        placeholder: "colorCount",
      },
      {
        name: "type",
        label: "نوع الحقل",
        type: "select",
        required: true,
        defaultValue: "TEXT",
        options: [
          { value: "TEXT", label: "نص قصير" },
          { value: "TEXTAREA", label: "نص طويل" },
          { value: "NUMBER", label: "رقم" },
          { value: "EMAIL", label: "بريد إلكتروني" },
          { value: "PHONE", label: "رقم جوال" },
          { value: "DATE", label: "تاريخ" },
          { value: "SELECT", label: "قائمة منسدلة" },
          { value: "RADIO", label: "اختيار واحد" },
          { value: "CHECKBOX", label: "اختيارات متعددة" },
        ],
      },
      {
        name: "options",
        label: "الخيارات المتاحة",
        type: "multiselect",
        wide: true,
        help: "خيار واحد في كل سطر. مطلوب لأنواع: قائمة منسدلة، اختيار واحد، اختيارات متعددة. حقل «نوع المنتج» يُملأ تلقائيًا إن تركته فارغًا.",
      },
      {
        name: "placeholder",
        label: "النص التوضيحي داخل الحقل",
        type: "text",
        placeholder: "مثال: ١٠٠٠ قطعة",
      },
      {
        name: "helpText",
        label: "نص المساعدة أسفل الحقل",
        type: "text",
        wide: true,
      },
      {
        name: "width",
        label: "عرض الحقل",
        type: "select",
        defaultValue: "HALF",
        options: [
          { value: "HALF", label: "نصف الصف" },
          { value: "FULL", label: "صف كامل" },
        ],
      },
      orderField,
      {
        name: "isRequired",
        label: "حقل إلزامي",
        type: "checkbox",
        help: "لن يتمكّن العميل من الإرسال قبل تعبئته.",
        defaultValue: false,
      },
      {
        name: "isActive",
        label: "ظاهر في النموذج",
        type: "checkbox",
        defaultValue: true,
      },
    ],
  },

  users: {
    model: "adminUser",
    slug: "users",
    title: "مستخدمو لوحة التحكم",
    singular: "مستخدم",
    description: "الحسابات التي يمكنها الدخول إلى لوحة التحكم.",
    icon: "users",
    orderBy: [{ createdAt: "asc" }],
    searchFields: ["name", "email"],
    columns: [
      { name: "name", label: "الاسم" },
      { name: "email", label: "البريد الإلكتروني" },
      { name: "role", label: "الصلاحية", render: "badge" },
      { name: "lastLoginAt", label: "آخر دخول", render: "date" },
      { name: "isActive", label: "مفعّل", render: "boolean" },
    ],
    fields: [
      { name: "name", label: "الاسم", type: "text", required: true },
      { name: "email", label: "البريد الإلكتروني", type: "text", required: true },
      {
        name: "role",
        label: "الصلاحية",
        type: "select",
        required: true,
        defaultValue: "ADMIN",
        options: ADMIN_ROLES.map((role) => ({
          value: role,
          label:
            role === "OWNER" ? "المالك" : role === "ADMIN" ? "مدير" : "محرّر",
        })),
      },
      { name: "isActive", label: "مفعّل", type: "checkbox", defaultValue: true },
    ],
  },
};

export function getResource(slug: string): ResourceDef | null {
  return RESOURCES[slug] ?? null;
}

export const RESOURCE_SLUGS = Object.keys(RESOURCES);

/** أنواع خيارات المنتجات — تُستخدم في شاشة تحرير المنتج. */
export const OPTION_TYPE_CHOICES = OPTION_TYPES.map((type) => ({ value: type, label: type }));
export const PROJECT_STAGE_CHOICES = PROJECT_IMAGE_STAGES.map((stage) => ({
  value: stage,
  label: stage,
}));
