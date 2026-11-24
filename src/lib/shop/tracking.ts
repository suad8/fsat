import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { normalizeOrderNumber, normalizeSaudiPhone, toLatinDigits } from "@/lib/shop/phone";

/**
 * تتبّع الطلب للعميل (قراءة فقط).
 *
 * الهوية = رقم الطلب + جوال الطلب معًا. لا يُكشف وجود الطلب إلا إذا تطابق
 * الاثنان، وأي فشل يُعامل بنفس النتيجة (null) سواء لم يوجد الطلب أو اختلف
 * الجوال، فلا يمكن استخدام الصفحة لتخمين أرقام الطلبات.
 *
 * التاريخ الزمني: لا يوجد جدول أحداث بعد، فنستنتج الخط الزمني من الحالة
 * الحالية وتاريخَي الإنشاء والتحديث. عند إضافة محور البيانات جدول أحداث
 * الحالة، مرّر الأحداث إلى buildTimeline (events) فتظهر تواريخ كل مرحلة
 * دون أي تغيير في الواجهة.
 */

export type OrderStatusEvent = { status: OrderStatus; at: Date };

export type TimelineStep = {
  status: OrderStatus;
  label: string;
  description: string;
  state: "done" | "current" | "upcoming";
  /** ISO — يظهر عندما يكون التاريخ معروفًا. */
  at: string | null;
};

export type TrackedOrder = {
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  paymentStatusLabel: string;
  paymentPending: boolean;
  cancelled: boolean;
  createdAt: string;
  updatedAt: string;
  fulfillment: "PICKUP" | "DELIVERY";
  city: string | null;
  items: { name: string; quantity: number; unit: string | null; options: string[] }[];
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    vat: number;
    total: number;
  };
  timeline: TimelineStep[];
  eta: { from: string; to: string } | null;
};

const FLOW: { status: OrderStatus; label: string; description: string }[] = [
  {
    status: "NEW",
    label: "تم استلام طلبك",
    description: "وصلنا طلبك وهو بانتظار المراجعة.",
  },
  {
    status: "CONFIRMED",
    label: "تأكيد الطلب والمراجعة الفنية",
    description: "نراجع المواصفات وملفات التصميم ونؤكد التفاصيل معك.",
  },
  {
    status: "IN_PRODUCTION",
    label: "قيد التنفيذ",
    description: "بدأ الإنتاج في المصنع.",
  },
  {
    status: "READY",
    label: "جاهز",
    description: "اكتمل التنفيذ وطلبك جاهز.",
  },
  {
    status: "SHIPPED",
    label: "تم الشحن",
    description: "خرج طلبك للتوصيل إلى عنوانك.",
  },
  {
    status: "DELIVERED",
    label: "تم التسليم",
    description: "وصل طلبك. نسعد بملاحظاتك.",
  },
];

/** يبني الخط الزمني حسب طريقة الاستلام (الاستلام من الفرع بلا مرحلة شحن). */
export function buildTimeline(args: {
  status: OrderStatus;
  fulfillment: "PICKUP" | "DELIVERY";
  createdAt: Date;
  updatedAt: Date;
  events?: OrderStatusEvent[];
}): TimelineStep[] {
  const { status, fulfillment, createdAt, updatedAt, events = [] } = args;

  const flow = FLOW.filter((step) => fulfillment === "DELIVERY" || step.status !== "SHIPPED").map(
    (step) => {
      if (fulfillment === "PICKUP" && step.status === "READY") {
        return { ...step, label: "جاهز للاستلام", description: "طلبك جاهز — يمكنك استلامه من الفرع." };
      }
      if (fulfillment === "PICKUP" && step.status === "DELIVERED") {
        return { ...step, label: "تم الاستلام", description: "استلمت طلبك. نسعد بملاحظاتك." };
      }
      if (fulfillment === "DELIVERY" && step.status === "READY") {
        return { ...step, label: "جاهز للشحن", description: "اكتمل التنفيذ ونجهّزه للشحن." };
      }
      return step;
    },
  );

  const currentIndex = Math.max(
    0,
    flow.findIndex((step) => step.status === status),
  );

  return flow.map((step, index): TimelineStep => {
    const event = events.find((entry) => entry.status === step.status);
    let at: Date | null = event?.at ?? null;

    if (!at && index === 0) at = createdAt;
    // بلا جدول أحداث: تاريخ آخر تحديث ينطبق على المرحلة الحالية فقط
    if (!at && index === currentIndex && index > 0) at = updatedAt;

    return {
      status: step.status,
      label: step.label,
      description: step.description,
      state: index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming",
      at: at ? at.toISOString() : null,
    };
  });
}

// ---------------------------------------------------------------------------
// تاريخ التسليم المتوقع
// ---------------------------------------------------------------------------

/**
 * يستخرج مدة بأيام العمل من نص حر مثل «٧ – ١٠ أيام عمل» أو «٢٤ ساعة».
 * يعيد null إن لم يُفهم النص، فلا نخترع تاريخًا.
 */
export function parseLeadDays(text: string | null | undefined): { min: number; max: number } | null {
  if (!text) return null;
  const latin = toLatinDigits(text);
  const numbers = (latin.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0 && n < 400);
  if (numbers.length === 0) return null;

  const factor = /ساع/.test(latin) ? 1 / 24 : /أسبوع|اسبوع|أسابيع|اسابيع/.test(latin) ? 6 : 1;
  const min = Math.max(1, Math.ceil(Math.min(...numbers) * factor));
  const max = Math.max(min, Math.ceil(Math.max(...numbers) * factor));
  return { min, max };
}

/** يضيف أيام عمل (السبت – الخميس؛ الجمعة إجازة). */
export function addWorkdays(from: Date, days: number): Date {
  const date = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 5) remaining -= 1;
  }
  return date;
}

// ---------------------------------------------------------------------------

/** يعيد الطلب إن تطابق الرقم والجوال، وإلا null (دون تمييز السبب). */
export async function lookupOrder(
  orderNumberRaw: string,
  phoneRaw: string,
): Promise<TrackedOrder | null> {
  const orderNumber = normalizeOrderNumber(orderNumberRaw);
  const phone = normalizeSaudiPhone(phoneRaw);
  if (!phone) return null;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });

  // مقارنة بآخر ٩ خانات: تتسامح مع اختلاف الصيغة المخزّنة (05… / 966…)
  const storedTail = order ? toLatinDigits(order.customerPhone).replace(/\D/g, "").slice(-9) : "";
  const givenTail = phone.slice(-9);
  if (!order || storedTail.length < 9 || storedTail !== givenTail) return null;

  const status = (order.status in ORDER_STATUS_LABELS ? order.status : "NEW") as OrderStatus;
  const paymentStatus = (
    order.paymentStatus in PAYMENT_STATUS_LABELS ? order.paymentStatus : "PENDING"
  ) as PaymentStatus;
  const fulfillment = order.fulfillment === "PICKUP" ? "PICKUP" : "DELIVERY";

  // مدة التنفيذ من المنتجات + مدة الشحن من منطقة المدينة
  const productIds = order.items.map((item) => item.productId).filter((id): id is string => !!id);
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, leadTime: true, unit: true },
      })
    : [];

  let eta: TrackedOrder["eta"] = null;
  if (status !== "CANCELLED" && status !== "DELIVERED") {
    const leads = products
      .map((product) => parseLeadDays(product.leadTime))
      .filter((lead): lead is { min: number; max: number } => lead !== null);

    if (leads.length > 0) {
      let min = Math.max(...leads.map((lead) => lead.min));
      let max = Math.max(...leads.map((lead) => lead.max));

      if (fulfillment === "DELIVERY" && order.city) {
        const zones = await prisma.shippingZone.findMany({ where: { isActive: true } });
        const zone = zones.find((candidate) => {
          const cities = Array.isArray(candidate.cities) ? (candidate.cities as string[]) : [];
          return cities.includes(order.city as string);
        });
        const ship = parseLeadDays(zone?.estimatedDays);
        if (ship) {
          min += ship.min;
          max += ship.max;
        }
      }

      // الإنتاج يبدأ من تاريخ الطلب؛ بعد الشحن تُحسب مدة الشحن وحدها
      const base = status === "SHIPPED" ? order.updatedAt : order.createdAt;
      eta = {
        from: addWorkdays(base, status === "SHIPPED" ? Math.min(min, 1) : min).toISOString(),
        to: addWorkdays(base, status === "SHIPPED" ? Math.max(max, 1) : max).toISOString(),
      };
    }
  }

  const unitById = new Map(products.map((product) => [product.id, product.unit]));

  return {
    orderNumber: order.orderNumber,
    status,
    statusLabel: ORDER_STATUS_LABELS[status],
    paymentStatusLabel: PAYMENT_STATUS_LABELS[paymentStatus],
    paymentPending: paymentStatus === "PENDING",
    cancelled: status === "CANCELLED",
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    fulfillment,
    city: order.city,
    items: order.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      unit: item.productId ? (unitById.get(item.productId) ?? null) : null,
      options: Array.isArray(item.selectedOptions)
        ? (item.selectedOptions as { label?: string; valueLabel?: string }[])
            .filter((option) => option?.label && option?.valueLabel)
            .map((option) => `${option.label}: ${option.valueLabel}`)
        : [],
    })),
    totals: {
      subtotal: order.subtotal,
      discount: order.discountAmount,
      shipping: order.shippingCost,
      vat: order.vatAmount,
      total: order.total,
    },
    timeline: buildTimeline({
      status,
      fulfillment,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }),
    eta,
  };
}
