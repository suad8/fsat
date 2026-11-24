import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  type FulfillmentMethod,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/constants";
import { writeAudit, type AuditActor } from "@/lib/data/audit";
import { releaseCoupon } from "@/lib/data/coupons";
import {
  checkOrderTransition,
  checkPaymentTransition,
  paymentSideEffect,
} from "@/lib/data/order-state";
import { prisma, type PrismaTx } from "@/lib/prisma";

/**
 * ============================================================================
 *  خدمة تغيير حالة الطلب
 * ============================================================================
 *  كل تغيير في حالة الطلب أو الدفع يمرّ من هنا، وفي معاملة واحدة:
 *
 *    ١. قراءة الحالة الحالية وفحص الانتقال مقابل آلة الحالات.
 *    ٢. تحديث مشروط (compare-and-set): `WHERE status = <ما قرأناه>`. إن غيّر
 *       مدير آخر الطلب في الأثناء يعود count = 0 فنرفض بدل الكتابة فوقه.
 *    ٣. كتابة حدث في OrderStatusEvent (الخط الزمني) + سطر في AuditLog.
 *
 *  فشل أي خطوة يتراجع بالكامل: لا تتغيّر حالة بلا أثر، ولا أثر بلا تغيير.
 * ============================================================================
 */

export type OrderChangeErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_STATUS"
  | "SAME_STATUS"
  | "NOT_ALLOWED"
  | "FINAL_STATUS"
  | "UNPAID_DELIVERY"
  | "PAYMENT_LOCKED"
  | "PAYMENT_NOT_ALLOWED";

export type OrderChanges = {
  status?: string;
  paymentStatus?: string;
  /** ملاحظات الإدارة الداخلية (حقل Order.adminNotes). */
  adminNotes?: string;
  /** ملاحظة تظهر للعميل في الخط الزمني مع حدث تغيير الحالة. */
  note?: string;
  /** ملاحظة داخلية تُسجَّل في التاريخ ولا يراها العميل. */
  internalNote?: string;
};

export type OrderChangeResult =
  | {
      ok: true;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      /** ما تغيّر فعلاً (فارغ إن لم يتغيّر شيء). */
      changed: ("status" | "paymentStatus" | "adminNotes" | "note")[];
    }
  | { ok: false; code: OrderChangeErrorCode; error: string };

class OrderChangeAbort extends Error {
  constructor(
    readonly code: OrderChangeErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

type ActorInfo = { actor: AuditActor | null; ip?: string | null };

function eventActor(actor: AuditActor | null) {
  return actor
    ? { actorType: "ADMIN", actorId: actor.id, actorName: actor.name }
    : { actorType: "SYSTEM", actorId: null, actorName: null };
}

/**
 * يطبّق تغييرات على طلب: الحالة والدفع والملاحظات، في معاملة واحدة.
 * الحقول غير المتغيّرة تُتجاهل (الواجهة ترسل كل الحقول في كل حفظ).
 */
export async function applyOrderChanges(
  orderId: string,
  changes: OrderChanges,
  context: ActorInfo,
): Promise<OrderChangeResult> {
  if (changes.status !== undefined && !isOrderStatus(changes.status)) {
    return { ok: false, code: "INVALID_STATUS", error: "حالة طلب غير معروفة." };
  }
  if (changes.paymentStatus !== undefined && !isPaymentStatus(changes.paymentStatus)) {
    return { ok: false, code: "INVALID_STATUS", error: "حالة دفع غير معروفة." };
  }

  try {
    return await prisma.$transaction(
      (tx) => applyInTransaction(tx, orderId, changes, context),
      { maxWait: 10_000, timeout: 20_000 },
    );
  } catch (error) {
    if (error instanceof OrderChangeAbort) {
      return { ok: false, code: error.code, error: error.message };
    }
    throw error;
  }
}

async function applyInTransaction(
  tx: PrismaTx,
  orderId: string,
  changes: OrderChanges,
  { actor, ip }: ActorInfo,
): Promise<OrderChangeResult> {
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderChangeAbort("NOT_FOUND", "الطلب غير موجود.");

  const currentStatus = order.status as OrderStatus;
  const currentPayment = order.paymentStatus as PaymentStatus;
  const fulfillment = order.fulfillment as FulfillmentMethod;
  const method = order.paymentMethod as PaymentMethod;

  const changed: ("status" | "paymentStatus" | "adminNotes" | "note")[] = [];
  const now = new Date();

  let nextStatus = currentStatus;
  let nextPayment = currentPayment;

  // --- الحالة ---
  const statusChanging =
    changes.status !== undefined && (changes.status as OrderStatus) !== currentStatus;

  // الدفع يُطبَّق قبل الحالة حين يُرسلان معًا: "مدفوع + تم التسليم" يجب أن ينجح
  if (changes.paymentStatus !== undefined && changes.paymentStatus !== currentPayment) {
    const to = changes.paymentStatus as PaymentStatus;
    const check = checkPaymentTransition({
      from: currentPayment,
      to,
      orderStatus: currentStatus,
    });
    if (!check.ok) throw new OrderChangeAbort(check.code, check.message);
    nextPayment = to;
  }

  if (statusChanging) {
    const to = changes.status as OrderStatus;
    const check = checkOrderTransition({
      from: currentStatus,
      to,
      fulfillment,
      paymentMethod: method,
      paymentStatus: nextPayment,
    });
    if (!check.ok) throw new OrderChangeAbort(check.code, check.message);
    nextStatus = to;

    // الدفع عند الاستلام يصبح مدفوعًا لحظة التسليم
    const implied = paymentSideEffect(to, method, nextPayment);
    if (implied) nextPayment = implied;
  }

  // --- الكتابة بشرط عدم تغيّر الطلب منذ قراءته ---
  const paymentChanged = nextPayment !== currentPayment;

  if (statusChanging || paymentChanged) {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: currentStatus, paymentStatus: currentPayment },
      data: {
        ...(statusChanging ? { status: nextStatus, statusChangedAt: now } : {}),
        ...(paymentChanged ? { paymentStatus: nextPayment } : {}),
      },
    });

    if (updated.count !== 1) {
      throw new OrderChangeAbort(
        "CONFLICT",
        "تغيّر الطلب للتو من جهة أخرى. حدّث الصفحة وأعد المحاولة.",
      );
    }
  }

  const publicNote = changes.note?.trim().slice(0, 500) || null;

  if (statusChanging) {
    changed.push("status");
    await tx.orderStatusEvent.create({
      data: {
        orderId,
        kind: "STATUS",
        fromStatus: currentStatus,
        toStatus: nextStatus,
        note: publicNote,
        isPublic: true,
        ...eventActor(actor),
      },
    });

    await writeAudit(
      {
        actor,
        action: "STATUS_CHANGE",
        entity: "Order",
        entityId: orderId,
        summary: `الطلب ${order.orderNumber}: ${ORDER_STATUS_LABELS[currentStatus]} ← ${ORDER_STATUS_LABELS[nextStatus]}`,
        changes: { status: { from: currentStatus, to: nextStatus } },
        ip,
      },
      tx,
    );

    // الإلغاء يُرجع استخدام الكوبون
    if (nextStatus === "CANCELLED") await releaseCoupon(tx, order.couponCode);
  }

  if (paymentChanged) {
    changed.push("paymentStatus");
    await tx.orderStatusEvent.create({
      data: {
        orderId,
        kind: "PAYMENT",
        fromStatus: currentPayment,
        toStatus: nextPayment,
        // الملاحظة العامة تُلحق بحدث الحالة إن وُجد، وإلا بحدث الدفع
        note: statusChanging ? null : publicNote,
        isPublic: true,
        ...eventActor(actor),
      },
    });

    await writeAudit(
      {
        actor,
        action: "STATUS_CHANGE",
        entity: "Order",
        entityId: orderId,
        summary: `الطلب ${order.orderNumber}: الدفع ${PAYMENT_STATUS_LABELS[currentPayment]} ← ${PAYMENT_STATUS_LABELS[nextPayment]}`,
        changes: { paymentStatus: { from: currentPayment, to: nextPayment } },
        ip,
      },
      tx,
    );
  }

  // ملاحظة عامة بلا تغيير حالة: حدث ملاحظة مرئي للعميل
  if (publicNote && !statusChanging && !paymentChanged) {
    changed.push("note");
    await tx.orderStatusEvent.create({
      data: {
        orderId,
        kind: "NOTE",
        note: publicNote,
        isPublic: true,
        ...eventActor(actor),
      },
    });
  }

  // ملاحظة داخلية: تُسجَّل في التاريخ للإدارة فقط
  const internal = changes.internalNote?.trim().slice(0, 1000);
  if (internal) {
    await tx.orderStatusEvent.create({
      data: {
        orderId,
        kind: "NOTE",
        note: internal,
        isPublic: false,
        ...eventActor(actor),
      },
    });
  }

  // --- ملاحظات الإدارة (حقل مستقل على الطلب) ---
  if (changes.adminNotes !== undefined) {
    const nextNotes = changes.adminNotes.slice(0, 2000) || null;
    if (nextNotes !== (order.adminNotes ?? null)) {
      changed.push("adminNotes");
      await tx.order.update({ where: { id: orderId }, data: { adminNotes: nextNotes } });
      await writeAudit(
        {
          actor,
          action: "UPDATE",
          entity: "Order",
          entityId: orderId,
          summary: `تعديل ملاحظات الإدارة على الطلب ${order.orderNumber}`,
          changes: { adminNotes: { from: order.adminNotes, to: nextNotes } },
          ip,
        },
        tx,
      );
    }
  }

  return { ok: true, status: nextStatus, paymentStatus: nextPayment, changed };
}

/** اختصار: تغيير حالة الطلب فقط. */
export function changeOrderStatus(
  orderId: string,
  to: OrderStatus,
  context: ActorInfo & { note?: string },
): Promise<OrderChangeResult> {
  return applyOrderChanges(orderId, { status: to, note: context.note }, context);
}

// ---------------------------------------------------------------------------
// الخط الزمني
// ---------------------------------------------------------------------------

export type TimelineEvent = {
  id: string;
  kind: "STATUS" | "PAYMENT" | "NOTE";
  fromStatus: string | null;
  toStatus: string | null;
  /** تسمية عربية جاهزة للعرض للحالة الجديدة. */
  label: string;
  note: string | null;
  actorType: "SYSTEM" | "ADMIN" | "CUSTOMER";
  /** اسم المنفّذ — للإدارة فقط (لا يُعاد في النسخة العامة). */
  actorName: string | null;
  isPublic: boolean;
  createdAt: Date;
};

function labelFor(kind: string, toStatus: string | null): string {
  if (kind === "NOTE") return "ملاحظة";
  if (!toStatus) return "";
  if (kind === "PAYMENT") return PAYMENT_STATUS_LABELS[toStatus as PaymentStatus] ?? toStatus;
  return ORDER_STATUS_LABELS[toStatus as OrderStatus] ?? toStatus;
}

/**
 * تاريخ الطلب مرتّبًا زمنيًا.
 * `publicOnly: true` يُعيد ما يراه العميل فقط ويُخفي أسماء المنفّذين.
 */
export async function getOrderTimeline(
  orderId: string,
  options: { publicOnly?: boolean } = {},
): Promise<TimelineEvent[]> {
  const rows = await prisma.orderStatusEvent.findMany({
    where: { orderId, ...(options.publicOnly ? { isPublic: true } : {}) },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as TimelineEvent["kind"],
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    label: labelFor(row.kind, row.toStatus),
    note: row.note,
    actorType: row.actorType as TimelineEvent["actorType"],
    actorName: options.publicOnly ? null : row.actorName,
    isPublic: row.isPublic,
    createdAt: row.createdAt,
  }));
}
