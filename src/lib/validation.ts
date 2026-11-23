import { z } from "zod";

import {
  CONTACT_PREFERENCES,
  FULFILLMENT_METHODS,
  MAX_DESIGN_SIZE,
  PAYMENT_METHODS,
  SAUDI_CITIES,
} from "@/lib/constants";

/**
 * مخططات التحقق.
 *
 * تُستخدم على الخادم دائمًا — تحقق المتصفّح للراحة فقط ولا يُعتمد عليه،
 * فأي طلب قد يصل مباشرة إلى الـ API دون المرور بالنموذج.
 */

// ---------------------------------------------------------------------------
// حقول مشتركة
// ---------------------------------------------------------------------------

/**
 * رقم جوال سعودي.
 * يقبل الصيغ المتداولة: 05XXXXXXXX و 5XXXXXXXX و +9665XXXXXXXX و 009665XXXXXXXX
 * ثم يوحّدها إلى 9665XXXXXXXX لتخزين متسق يصلح للواتساب مباشرة.
 */
export const saudiPhone = z
  .string()
  .trim()
  .min(1, "رقم الجوال مطلوب")
  // لوحة المفاتيح العربية تكتب أرقامًا شرقية (٠٥…) أو فارسية (۰۵…): نحوّلها للاتينية
  .transform((value) =>
    value
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)),
  )
  .transform((value) => value.replace(/[\s\-()]/g, ""))
  .refine(
    (value) => /^(?:\+?966|00966|0)?5\d{8}$/.test(value),
    "أدخل رقم جوال سعودي صحيح — مثال: 0512345678",
  )
  .transform((value) => {
    const digits = value.replace(/\D/g, "");
    const local = digits.slice(-9); // آخر ٩ خانات تبدأ بـ 5
    return `966${local}`;
  });

const optionalEmail = z
  .string()
  .trim()
  .email("صيغة البريد الإلكتروني غير صحيحة")
  .max(160)
  .optional()
  .or(z.literal("").transform(() => undefined));

const personName = z
  .string()
  .trim()
  .min(2, "الاسم قصير جدًا")
  .max(80, "الاسم طويل جدًا");

const city = z
  .string()
  .trim()
  .min(2, "المدينة مطلوبة")
  .max(60)
  .refine(
    (value) => SAUDI_CITIES.includes(value as (typeof SAUDI_CITIES)[number]) || value.length >= 2,
    "اختر مدينة من القائمة أو اكتب اسمها",
  );

/**
 * حقل فخّ (Honeypot).
 * حقل مخفي بصريًا يتركه البشر فارغًا وتملؤه الروبوتات غالبًا.
 * وجود قيمة فيه يعني إرسالاً آليًا.
 */
export const honeypot = z
  .string()
  .max(0, "تعذّر إرسال النموذج")
  .optional()
  .or(z.literal("").transform(() => undefined));

/**
 * رابط مرفق مرفوع.
 *
 * الرابط يأتي من المتصفّح فلا يُوثق به: يُقبل فقط شكلا الروابط التي يولّدها
 * مسار الرفع نفسه. بدون هذا يستطيع زائر تخزين `javascript:` أو رابط تصيّد في
 * الطلب، فيظهر كرابط قابل للنقر في لوحة الإدارة (XSS مخزَّن / تصيّد).
 */
export const UPLOAD_URL_PATTERN =
  /^(?:\/uploads\/[a-z0-9-]{1,32}\/[a-z0-9]+-[a-f0-9]{16}\.(?:webp|png|jpg|avif)|\/api\/admin\/files\/[a-z0-9]+-[a-f0-9]{16}\.[a-z0-9]{1,5})$/i;

/** مرفق مرفوع — يُحفظ مساره فقط بعد أن يتحقق منه مسار الرفع. */
export const attachmentSchema = z.object({
  kind: z.enum(["DESIGN", "LOGO", "REFERENCE"]).default("REFERENCE"),
  name: z
    .string()
    .trim()
    .min(1)
    .max(255)
    // محارف التحكم تفسد السجلّات والعرض
    .transform((value) => value.replace(/[\u0000-\u001f\u007f]/g, " ")),
  url: z.string().trim().max(300).regex(UPLOAD_URL_PATTERN, "رابط المرفق غير صالح"),
  size: z.number().int().nonnegative().max(MAX_DESIGN_SIZE),
  mimeType: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z]+\/[a-z0-9.+-]{1,80}$/i, "نوع الملف غير صالح"),
});

// ---------------------------------------------------------------------------
// طلب عرض سعر
// ---------------------------------------------------------------------------

export const quoteRequestSchema = z.object({
  customerName: personName,
  companyName: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  phone: saudiPhone,
  email: optionalEmail,
  city,
  productType: z.string().trim().min(2, "حدّد نوع المنتج أو الخدمة").max(120),
  productSlug: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  size: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  quantity: z.string().trim().max(60).optional().or(z.literal("").transform(() => undefined)),
  description: z
    .string()
    .trim()
    .min(10, "اكتب وصفًا للطلب لا يقل عن ١٠ أحرف")
    .max(2000, "الوصف طويل جدًا"),
  dueDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .refine(
      (value) => !value || !Number.isNaN(Date.parse(value)),
      "صيغة التاريخ غير صحيحة",
    ),
  preferredContact: z.enum(CONTACT_PREFERENCES).default("WHATSAPP"),
  attachments: z.array(attachmentSchema).max(10).optional(),
  acceptTerms: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .refine((value) => value === true || value === "on" || value === "true", {
      message: "يجب الموافقة على الشروط والأحكام",
    }),
  website: honeypot,
});

export type QuoteRequestInput = z.input<typeof quoteRequestSchema>;
export type QuoteRequestData = z.output<typeof quoteRequestSchema>;

// ---------------------------------------------------------------------------
// رسالة تواصل
// ---------------------------------------------------------------------------

export const contactMessageSchema = z.object({
  name: personName,
  phone: saudiPhone,
  email: optionalEmail,
  subject: z.string().trim().max(140).optional().or(z.literal("").transform(() => undefined)),
  message: z
    .string()
    .trim()
    .min(10, "اكتب رسالتك — ١٠ أحرف على الأقل")
    .max(2000, "الرسالة طويلة جدًا"),
  website: honeypot,
});

export type ContactMessageData = z.output<typeof contactMessageSchema>;

// ---------------------------------------------------------------------------
// إتمام الطلب
// ---------------------------------------------------------------------------

/** بند سلة كما يصل من المتصفّح — تُعاد كل الأسعار حسابًا على الخادم. */
export const checkoutItemSchema = z.object({
  productId: z.string().trim().min(1).max(64),
  quantity: z.number().int().positive().max(1_000_000),
  /** معرّفات القيم المختارة: مفتاح المجموعة ← معرّف أو مصفوفة معرّفات. */
  selection: z
    .record(
      z.string().max(64),
      z.union([z.string().max(600), z.array(z.string().max(64)).max(50)]),
    )
    .refine((value) => Object.keys(value).length <= 40, "خيارات كثيرة جدًا"),
  notes: z.string().trim().max(500).optional(),
});

export const checkoutSchema = z
  .object({
    customerName: personName,
    customerPhone: saudiPhone,
    customerEmail: optionalEmail,
    companyName: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),

    fulfillment: z.enum(FULFILLMENT_METHODS),
    city: z.string().trim().max(60).optional().or(z.literal("").transform(() => undefined)),
    district: z.string().trim().max(80).optional().or(z.literal("").transform(() => undefined)),
    addressLine: z.string().trim().max(240).optional().or(z.literal("").transform(() => undefined)),
    postalCode: z.string().trim().max(12).optional().or(z.literal("").transform(() => undefined)),

    paymentMethod: z.enum(PAYMENT_METHODS),
    couponCode: z.string().trim().max(40).optional().or(z.literal("").transform(() => undefined)),
    notes: z.string().trim().max(1000).optional().or(z.literal("").transform(() => undefined)),

    items: z.array(checkoutItemSchema).min(1, "السلة فارغة").max(50, "عدد البنود كبير جدًا"),

    acceptTerms: z
      .union([z.literal("on"), z.literal("true"), z.boolean()])
      .refine((value) => value === true || value === "on" || value === "true", {
        message: "يجب الموافقة على الشروط والأحكام",
      }),
    website: honeypot,
  })
  // عنوان التوصيل إلزامي فقط عند اختيار الشحن
  .refine((data) => data.fulfillment !== "DELIVERY" || Boolean(data.city), {
    message: "اختر مدينة التوصيل",
    path: ["city"],
  })
  .refine((data) => data.fulfillment !== "DELIVERY" || Boolean(data.addressLine), {
    message: "أدخل عنوان التوصيل",
    path: ["addressLine"],
  });

export type CheckoutData = z.output<typeof checkoutSchema>;

// ---------------------------------------------------------------------------
// تسجيل دخول لوحة التحكم
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().trim().email("صيغة البريد الإلكتروني غير صحيحة").max(160),
  password: z.string().min(1, "كلمة المرور مطلوبة").max(200),
});

// ---------------------------------------------------------------------------
// مساعد لتحويل أخطاء Zod إلى خريطة حقل ← رسالة
// ---------------------------------------------------------------------------

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    // نحتفظ بأول خطأ لكل حقل — عرض عدة أخطاء للحقل الواحد يشتّت المستخدم
    if (!result[key]) result[key] = issue.message;
  }

  return result;
}
