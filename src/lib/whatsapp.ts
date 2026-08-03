import { contact } from "@/config/brand";
import { absoluteUrl, formatNumber } from "@/lib/utils";

/**
 * بناء روابط واتساب مع رسالة معبّأة مسبقًا.
 *
 * نستخدم wa.me لأنه يعمل على الجوال (يفتح التطبيق) وعلى سطح المكتب
 * (يحوّل إلى واتساب ويب) دون الحاجة لاكتشاف نوع الجهاز.
 */

const WA_BASE = "https://wa.me";

function buildUrl(message: string): string {
  const number = contact.whatsapp.replace(/\D/g, "");
  return `${WA_BASE}/${number}?text=${encodeURIComponent(message)}`;
}

/** رابط عام — للزر العائم والترويسة. */
export function whatsappGeneralUrl(context?: string): string {
  const lines = ["السلام عليكم،", "أرغب في الاستفسار عن خدماتكم."];
  if (context) lines.push("", `الصفحة: ${context}`);
  return buildUrl(lines.join("\n"));
}

export type WhatsAppProductPayload = {
  productName: string;
  productPath: string;
  /** الخيارات المختارة كأزواج: اسم المجموعة ← القيمة. */
  options?: { label: string; value: string }[];
  size?: string | null;
  quantity?: number | null;
  /** السعر التقديري المحسوب في الصفحة، إن كان المنتج قابلاً للتسعير المباشر. */
  estimatedPrice?: string | null;
  notes?: string | null;
};

/**
 * رسالة واتساب لصفحة منتج — تحتوي على كل ما تحتاجه المبيعات للرد فورًا
 * دون سؤال العميل عن التفاصيل مرة أخرى.
 */
export function whatsappProductUrl(payload: WhatsAppProductPayload): string {
  const {
    productName,
    productPath,
    options = [],
    size,
    quantity,
    estimatedPrice,
    notes,
  } = payload;

  const lines: string[] = ["السلام عليكم،", "أرغب في طلب المنتج التالي:", ""];

  lines.push(`▪️ المنتج: ${productName}`);
  if (size) lines.push(`▪️ المقاس: ${size}`);
  if (quantity && quantity > 0) lines.push(`▪️ الكمية: ${formatNumber(quantity)}`);

  const extraOptions = options.filter((o) => o.value && o.value.trim().length > 0);
  if (extraOptions.length > 0) {
    lines.push("▪️ الخيارات:");
    for (const opt of extraOptions) lines.push(`   • ${opt.label}: ${opt.value}`);
  }

  if (estimatedPrice) lines.push(`▪️ السعر التقديري: ${estimatedPrice}`);
  if (notes?.trim()) lines.push(`▪️ ملاحظات: ${notes.trim()}`);

  lines.push("", `🔗 ${absoluteUrl(productPath)}`);

  return buildUrl(lines.join("\n"));
}

/** رسالة واتساب من صفحة مشروع في معرض الأعمال. */
export function whatsappProjectUrl(projectTitle: string, projectPath: string): string {
  const message = [
    "السلام عليكم،",
    "شاهدت هذا المشروع في معرض أعمالكم وأرغب في تنفيذ مشروع مشابه:",
    "",
    `▪️ المشروع: ${projectTitle}`,
    "",
    `🔗 ${absoluteUrl(projectPath)}`,
  ].join("\n");
  return buildUrl(message);
}

/** رسالة واتساب من صفحة خدمة. */
export function whatsappServiceUrl(serviceTitle: string, servicePath: string): string {
  const message = [
    "السلام عليكم،",
    "أرغب في الاستفسار عن الخدمة التالية:",
    "",
    `▪️ الخدمة: ${serviceTitle}`,
    "",
    `🔗 ${absoluteUrl(servicePath)}`,
  ].join("\n");
  return buildUrl(message);
}

/** رسالة متابعة لطلب أو عرض سعر برقم مرجعي. */
export function whatsappReferenceUrl(reference: string, kind: "order" | "quote"): string {
  const label = kind === "order" ? "الطلب" : "طلب عرض السعر";
  const message = [
    "السلام عليكم،",
    `أرغب في متابعة ${label} رقم: ${reference}`,
  ].join("\n");
  return buildUrl(message);
}

/** رابط الاتصال المباشر. */
export const telUrl = `tel:${contact.phone}`;
/** رابط البريد. */
export const mailUrl = `mailto:${contact.email}`;
