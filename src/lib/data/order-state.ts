import {
  ORDER_STATUS_LABELS,
  type FulfillmentMethod,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/constants";

/**
 * ============================================================================
 *  آلة حالات الطلب والدفع
 * ============================================================================
 *  وحدة خالصة — يمكن استيرادها من مكوّنات العميل (مثلاً لعرض الخيارات التالية
 *  المسموحة فقط في قائمة تغيير الحالة) ومن الخادم الذي يفرضها فعليًا
 *  (src/lib/data/order-service.ts). الخادم هو المرجع: إخفاء خيار في الواجهة
 *  لا يغني عن فحصه هنا.
 *
 *  مسار الطلب:
 *
 *    NEW → CONFIRMED → IN_PRODUCTION → READY ─┬→ SHIPPED → DELIVERED   (توصيل)
 *                                              └→ DELIVERED            (استلام من الفرع)
 *
 *    • CANCELLED متاح من NEW / CONFIRMED / IN_PRODUCTION / READY (بعد الشحن
 *      لا إلغاء — يصبح مرتجعًا يُعالَج خارج هذا المسار).
 *    • READY → IN_PRODUCTION  إعادة تصنيع (عيب جودة اكتُشف عند التجهيز).
 *    • SHIPPED → READY        تعذّر التسليم وعادت الشحنة.
 *    • DELIVERED و CANCELLED حالتان نهائيتان — لا رجوع منهما.
 * ============================================================================
 */

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["READY", "CANCELLED"],
  READY: ["SHIPPED", "DELIVERED", "IN_PRODUCTION", "CANCELLED"],
  SHIPPED: ["DELIVERED", "READY"],
  DELIVERED: [],
  CANCELLED: [],
};

export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = ["DELIVERED", "CANCELLED"];

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}

/**
 * الحالات التالية المسموحة لطلب معيّن.
 * الاستلام من الفرع لا يمرّ بـ SHIPPED، والتوصيل لا يقفز من READY إلى DELIVERED.
 */
export function allowedNextStatuses(
  from: OrderStatus,
  fulfillment: FulfillmentMethod,
): OrderStatus[] {
  return ORDER_TRANSITIONS[from].filter((to) => {
    if (fulfillment === "PICKUP" && to === "SHIPPED") return false;
    if (fulfillment === "DELIVERY" && from === "READY" && to === "DELIVERED") return false;
    return true;
  });
}

export type TransitionCode =
  | "SAME_STATUS"
  | "NOT_ALLOWED"
  | "FINAL_STATUS"
  | "UNPAID_DELIVERY"
  | "PAYMENT_LOCKED"
  | "PAYMENT_NOT_ALLOWED";

export type TransitionCheck =
  | { ok: true }
  | { ok: false; code: TransitionCode; message: string };

/** هل يجوز الانتقال من حالة إلى أخرى؟ */
export function checkOrderTransition(input: {
  from: OrderStatus;
  to: OrderStatus;
  fulfillment: FulfillmentMethod;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}): TransitionCheck {
  const { from, to, fulfillment, paymentMethod, paymentStatus } = input;

  if (from === to) {
    return { ok: false, code: "SAME_STATUS", message: "الطلب في هذه الحالة بالفعل." };
  }

  if (isTerminalStatus(from)) {
    return {
      ok: false,
      code: "FINAL_STATUS",
      message: `الطلب «${ORDER_STATUS_LABELS[from]}» ولا يمكن تغيير حالته.`,
    };
  }

  if (!allowedNextStatuses(from, fulfillment).includes(to)) {
    return {
      ok: false,
      code: "NOT_ALLOWED",
      message: `لا يمكن نقل الطلب من «${ORDER_STATUS_LABELS[from]}» إلى «${ORDER_STATUS_LABELS[to]}».`,
    };
  }

  // الطلب المدفوع مسبقًا (تحويل/إلكتروني) لا يُسلَّم قبل تأكيد الدفع.
  // الدفع عند الاستلام يُسجَّل تلقائيًا مدفوعًا لحظة التسليم (انظر paymentSideEffect).
  if (
    to === "DELIVERED" &&
    isPrepaid(paymentMethod) &&
    paymentStatus !== "PAID"
  ) {
    return {
      ok: false,
      code: "UNPAID_DELIVERY",
      message: "لا يمكن تسليم طلب لم يُؤكَّد دفعه. حدّث حالة الدفع أولاً.",
    };
  }

  return { ok: true };
}

/** طرق الدفع التي تسبق التسليم. */
export function isPrepaid(method: PaymentMethod): boolean {
  return method === "BANK_TRANSFER" || method === "ONLINE";
}

/**
 * أثر جانبي مفروض عند التسليم: الدفع عند الاستلام يصبح مدفوعًا.
 * يعيد حالة الدفع الجديدة أو null إن لم يتغيّر شيء.
 */
export function paymentSideEffect(
  to: OrderStatus,
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus,
): PaymentStatus | null {
  if (to === "DELIVERED" && !isPrepaid(paymentMethod) && paymentStatus === "PENDING") {
    return "PAID";
  }
  return null;
}

// ---------------------------------------------------------------------------
// حالات الدفع
// ---------------------------------------------------------------------------

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED"],
  FAILED: ["PENDING", "PAID"],
  PAID: ["REFUNDED"],
  REFUNDED: [],
};

export function checkPaymentTransition(input: {
  from: PaymentStatus;
  to: PaymentStatus;
  orderStatus: OrderStatus;
}): TransitionCheck {
  const { from, to, orderStatus } = input;

  if (from === to) {
    return { ok: false, code: "SAME_STATUS", message: "حالة الدفع كما هي." };
  }

  if (!PAYMENT_TRANSITIONS[from].includes(to)) {
    return {
      ok: false,
      code: "PAYMENT_NOT_ALLOWED",
      message: "هذا الانتقال في حالة الدفع غير مسموح.",
    };
  }

  // طلب ملغى لا يُقبض عليه مال جديد؛ يُسمح فقط برد ما دُفع
  if (orderStatus === "CANCELLED" && to !== "REFUNDED") {
    return {
      ok: false,
      code: "PAYMENT_LOCKED",
      message: "الطلب ملغى — يمكن فقط تسجيل استرجاع المبلغ المدفوع.",
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// الخط الزمني للعميل
// ---------------------------------------------------------------------------

/**
 * مراحل شريط التقدّم المعروض للعميل، بحسب طريقة الاستلام.
 * الطلب الملغى يُعرض بشكل مستقل ولا يظهر ضمن المراحل.
 */
export function customerProgressSteps(fulfillment: FulfillmentMethod): OrderStatus[] {
  return fulfillment === "DELIVERY"
    ? ["NEW", "CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED"]
    : ["NEW", "CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED"];
}
