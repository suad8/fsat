import { brand } from "@/config/brand";
import { waLink } from "@/lib/admin/format";
import { formatPriceWithCurrency } from "@/lib/utils";

/**
 * رسائل واتساب الجاهزة من الإدارة إلى العميل.
 *
 * رسالة لكل مرحلة من دورة العمل: صاحب المطبعة لا يكتب النص من الصفر في كل
 * مرة، يضغط الزر فيفتح واتساب برسالة مناسبة للحالة الحالية قابلة للتعديل قبل
 * الإرسال. الصيغة ودّية ومهنية وتنتهي باسم المنشأة.
 */

const SIGN = `— ${brand.nameShort}`;

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function orderWhatsAppMessage(order: {
  orderNumber: string;
  customerName: string;
  status: string;
  total: number;
  fulfillment: string;
  hasDesignFile: boolean;
}): string {
  const hello = `السلام عليكم أ. ${firstName(order.customerName)}،`;
  const ref = `طلبكم رقم ${order.orderNumber}`;

  switch (order.status) {
    case "NEW":
      return [
        hello,
        `استلمنا ${ref} بإجمالي ${formatPriceWithCurrency(order.total)}.`,
        order.hasDesignFile
          ? "نراجع التفاصيل وملف التصميم وسنؤكد لكم خلال وقت قصير."
          : "نراجع التفاصيل وسنؤكد لكم قريبًا. فضلاً أرسلوا ملف التصميم هنا (PDF أو AI أو صورة عالية الدقة) إن لم يكن مرفقًا.",
        SIGN,
      ].join("\n");

    case "CONFIRMED":
      return [
        hello,
        `تم تأكيد ${ref}.`,
        order.hasDesignFile
          ? "سننتقل الآن إلى التجهيز للإنتاج."
          : "لنبدأ الإنتاج نحتاج ملف التصميم النهائي — أرسلوه هنا متى جاهزًا.",
        SIGN,
      ].join("\n");

    case "IN_PRODUCTION":
      return [hello, `${ref} الآن قيد التنفيذ في المصنع، وسنبلغكم فور اكتماله.`, SIGN].join("\n");

    case "READY":
      return [
        hello,
        order.fulfillment === "PICKUP"
          ? `${ref} جاهز للاستلام من الفرع. نرجو إحضار رقم الطلب عند الاستلام.`
          : `${ref} جاهز وسيُشحن إليكم قريبًا، وسنرسل لكم بيانات الشحنة.`,
        SIGN,
      ].join("\n");

    case "SHIPPED":
      return [hello, `تم شحن ${ref}. سنوافيكم برقم التتبع إن توفّر.`, SIGN].join("\n");

    case "DELIVERED":
      return [
        hello,
        `نأمل أن ${ref} قد وصلكم بالشكل المرضي. نسعد بملاحظاتكم ونتشرّف بخدمتكم دائمًا.`,
        SIGN,
      ].join("\n");

    case "CANCELLED":
      return [hello, `نفيدكم بإلغاء ${ref}. للاستفسار أو إعادة الطلب نحن بخدمتكم.`, SIGN].join("\n");

    default:
      return [hello, `بخصوص ${ref}:`, SIGN].join("\n");
  }
}

export function orderWhatsAppUrl(
  phone: string,
  order: Parameters<typeof orderWhatsAppMessage>[0],
): string {
  return waLink(phone, orderWhatsAppMessage(order));
}

export function quoteWhatsAppMessage(quote: {
  reference: string;
  customerName: string;
  productType: string;
  status: string;
  quotedAmount: number | null;
}): string {
  const hello = `السلام عليكم أ. ${firstName(quote.customerName)}،`;

  if (quote.status === "QUOTED" && quote.quotedAmount !== null) {
    return [
      hello,
      `بخصوص طلب عرض السعر ${quote.reference} (${quote.productType}):`,
      `قيمة العرض ${formatPriceWithCurrency(quote.quotedAmount)}.`,
      "هل نعتمد الطلب ونبدأ التنفيذ؟ يسعدنا الإجابة عن أي استفسار.",
      SIGN,
    ].join("\n");
  }

  if (quote.status === "WON") {
    return [hello, `شكرًا لاعتماد عرض السعر ${quote.reference}. سنبدأ التنفيذ ونوافيكم بالتفاصيل.`, SIGN].join("\n");
  }

  return [
    hello,
    `استلمنا طلب عرض السعر ${quote.reference} (${quote.productType}).`,
    "نراجع المواصفات وملفات التصميم وسنرسل لكم العرض قريبًا. هل من تفاصيل إضافية تودّون إضافتها؟",
    SIGN,
  ].join("\n");
}

export function messageReplyWhatsApp(message: { name: string; subject: string | null }): string {
  return [
    `السلام عليكم أ. ${firstName(message.name)}،`,
    `شكرًا لتواصلكم معنا${message.subject ? ` بخصوص «${message.subject}»` : ""}.`,
    "كيف نقدر نخدمكم؟",
    SIGN,
  ].join("\n");
}

export function quoteWhatsAppUrl(
  phone: string,
  quote: Parameters<typeof quoteWhatsAppMessage>[0],
): string {
  return waLink(phone, quoteWhatsAppMessage(quote));
}
