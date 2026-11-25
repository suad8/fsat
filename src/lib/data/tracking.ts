import type { FulfillmentMethod, OrderStatus, PaymentStatus } from "@/lib/constants";
import { getOrderTimeline, type TimelineEvent } from "@/lib/data/order-service";
import { allowedNextStatuses, customerProgressSteps } from "@/lib/data/order-state";
import { prisma } from "@/lib/prisma";
import { saudiPhone } from "@/lib/validation";

/**
 * ============================================================================
 *  تتبّع الطلب للعميل (رقم الطلب + الجوال)
 * ============================================================================
 *  أرقام الطلبات متسلسلة وقابلة للتخمين، فالجوال هو السرّ الثاني. أي عدم
 *  تطابق (رقم خاطئ، جوال خاطئ، جوال بصيغة غير صالحة) يعيد null بلا تمييز
 *  بين الأسباب، فلا يُستدلّ منه على وجود الطلب.
 *
 *  ⚠️ المُستدعي (صفحة/مسار التتبّع) مسؤول عن تحديد المعدّل (rate limit) —
 *     وإلا أمكن تخمين أرقام الجوالات بالتجربة.
 *
 *  لا يُعاد هنا: ملاحظات الإدارة، أسماء الموظفين، الأحداث الداخلية، الإيميل.
 * ============================================================================
 */

export type TrackedOrder = {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillment: FulfillmentMethod;
  city: string | null;
  createdAt: Date;
  statusChangedAt: Date;
  /** مراحل شريط التقدّم بحسب طريقة الاستلام. */
  steps: OrderStatus[];
  /** المرحلة الحالية ضمن steps (-1 للطلب الملغى). */
  currentStepIndex: number;
  items: {
    productName: string;
    productSlug: string;
    quantity: number;
    options: { label: string; valueLabel: string }[];
  }[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  vatAmount: number;
  total: number;
  timeline: TimelineEvent[];
};

/** يوحّد ما يكتبه العميل: ORD-2026-0043 بأي حالة أحرف ومسافات. */
function normalizeOrderNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export async function trackOrder(
  orderNumber: string,
  phone: string,
): Promise<TrackedOrder | null> {
  const parsedPhone = saudiPhone.safeParse(phone);
  if (!parsedPhone.success) return null;

  const order = await prisma.order.findUnique({
    where: { orderNumber: normalizeOrderNumber(orderNumber) },
    include: { items: { select: {
      productName: true,
      productSlug: true,
      quantity: true,
      selectedOptions: true,
    } } },
  });

  if (!order || order.customerPhone !== parsedPhone.data) return null;

  const status = order.status as OrderStatus;
  const fulfillment = order.fulfillment as FulfillmentMethod;
  const steps = customerProgressSteps(fulfillment);

  const timeline = await getOrderTimeline(order.id, { publicOnly: true });

  return {
    orderNumber: order.orderNumber,
    status,
    paymentStatus: order.paymentStatus as PaymentStatus,
    fulfillment,
    city: order.city,
    createdAt: order.createdAt,
    statusChangedAt: order.statusChangedAt,
    steps,
    currentStepIndex: steps.indexOf(status),
    items: order.items.map((item) => ({
      productName: item.productName,
      productSlug: item.productSlug,
      quantity: item.quantity,
      options: (Array.isArray(item.selectedOptions) ? item.selectedOptions : []).flatMap(
        (option) => {
          const entry = option as { label?: unknown; valueLabel?: unknown };
          return typeof entry.label === "string" && typeof entry.valueLabel === "string"
            ? [{ label: entry.label, valueLabel: entry.valueLabel }]
            : [];
        },
      ),
    })),
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    shippingCost: order.shippingCost,
    vatAmount: order.vatAmount,
    total: order.total,
    timeline,
  };
}

/** الحالات التالية المسموحة لطلب — لقائمة تغيير الحالة في لوحة الإدارة. */
export async function getAllowedNextStatuses(orderId: string): Promise<OrderStatus[]> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, fulfillment: true },
  });
  if (!order) return [];
  return allowedNextStatuses(order.status as OrderStatus, order.fulfillment as FulfillmentMethod);
}
