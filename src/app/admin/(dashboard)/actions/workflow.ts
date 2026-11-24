"use server";

import { revalidatePath } from "next/cache";

import {
  MESSAGE_STATUSES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUSES,
  type QuoteStatus,
} from "@/lib/constants";
import { getAdminContext, type AdminContext } from "@/lib/data/admin-context";
import { diffRecords, logAudit } from "@/lib/data/audit";
import { applyOrderChanges } from "@/lib/data/order-service";
import { prisma } from "@/lib/prisma";

/**
 * تحديث حالات الطلبات وعروض الأسعار والرسائل.
 *
 * الطلبات تمرّ كلها من خدمة الطلبات (src/lib/data/order-service.ts) التي تفرض
 * آلة الحالات وتكتب الخط الزمني وسجلّ التدقيق في معاملة واحدة. هنا نتحقق من
 * الجلسة فقط ونترجم النتيجة للواجهة.
 */

type Result = { ok: boolean; error?: string };

async function guard(): Promise<{ ctx: AdminContext } | { denied: Result }> {
  try {
    return { ctx: await getAdminContext() };
  } catch {
    return { denied: { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." } };
  }
}

// ---------------------------------------------------------------------------
// الطلبات
// ---------------------------------------------------------------------------

/**
 * تحديث طلب. الحقول الاختيارية الجديدة (توافقية مع الواجهة الحالية):
 *   note          ملاحظة تظهر للعميل في خط التتبّع مع تغيير الحالة
 *   internalNote  ملاحظة تُسجَّل للإدارة فقط
 */
export async function updateOrderAction(
  id: string,
  changes: {
    status?: string;
    paymentStatus?: string;
    adminNotes?: string;
    note?: string;
    internalNote?: string;
  },
): Promise<Result> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;

  let result;
  try {
    result = await applyOrderChanges(id, changes, { actor: auth.ctx.actor, ip: auth.ctx.ip });
  } catch (error) {
    console.error("[admin] فشل تحديث الطلب:", error);
    return { ok: false, error: "تعذّر تحديث الطلب." };
  }

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// عروض الأسعار
// ---------------------------------------------------------------------------

const MAX_QUOTED_AMOUNT = 100_000_000;

export async function updateQuoteAction(
  id: string,
  changes: { status?: string; quotedAmount?: number | null; adminNotes?: string },
): Promise<Result> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;

  const data: Record<string, unknown> = {};

  if (changes.status !== undefined) {
    if (!(QUOTE_STATUSES as readonly string[]).includes(changes.status)) {
      return { ok: false, error: "حالة غير معروفة." };
    }
    data.status = changes.status;
  }

  if (changes.quotedAmount !== undefined) {
    const amount = changes.quotedAmount;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > MAX_QUOTED_AMOUNT)) {
      return { ok: false, error: "قيمة العرض غير صحيحة." };
    }
    // مضاعف دقيق للهللة (لا ٣٣٫٣٣٣٣)
    data.quotedAmount = amount === null ? null : Math.round(amount * 100) / 100;
  }

  if (changes.adminNotes !== undefined) {
    data.adminNotes = changes.adminNotes.slice(0, 2000);
  }

  if (Object.keys(data).length === 0) return { ok: true };

  try {
    const before = await prisma.quoteRequest.findUnique({ where: { id } });
    if (!before) return { ok: false, error: "الطلب غير موجود." };

    await prisma.quoteRequest.update({ where: { id }, data });

    const diff = diffRecords(before, data);
    if (diff) {
      const statusChange = data.status && data.status !== before.status;
      await logAudit({
        actor: auth.ctx.actor,
        action: statusChange ? "STATUS_CHANGE" : "UPDATE",
        entity: "QuoteRequest",
        entityId: id,
        summary: statusChange
          ? `عرض السعر ${before.reference}: ${QUOTE_STATUS_LABELS[before.status as QuoteStatus]} ← ${QUOTE_STATUS_LABELS[data.status as QuoteStatus]}`
          : `تعديل عرض السعر ${before.reference}`,
        changes: diff,
        ip: auth.ctx.ip,
      });
    }
  } catch (error) {
    console.error("[admin] فشل تحديث عرض السعر:", error);
    return { ok: false, error: "تعذّر تحديث الطلب." };
  }

  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// الرسائل
// ---------------------------------------------------------------------------

export async function updateMessageStatusAction(
  id: string,
  status: string,
): Promise<Result> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;

  if (!(MESSAGE_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "حالة غير معروفة." };
  }

  try {
    await prisma.contactMessage.update({ where: { id }, data: { status } });
  } catch (error) {
    console.error("[admin] فشل تحديث الرسالة:", error);
    return { ok: false, error: "تعذّر تحديث الرسالة." };
  }

  revalidatePath("/admin/messages");
  return { ok: true };
}

export async function deleteMessageAction(id: string): Promise<Result> {
  const auth = await guard();
  if ("denied" in auth) return auth.denied;

  try {
    const message = await prisma.contactMessage.delete({ where: { id } });
    await logAudit({
      actor: auth.ctx.actor,
      action: "DELETE",
      entity: "ContactMessage",
      entityId: id,
      summary: `حذف رسالة تواصل من ${message.name}`,
      changes: { name: message.name, phone: message.phone, subject: message.subject },
      ip: auth.ctx.ip,
    });
  } catch (error) {
    console.error("[admin] فشل حذف الرسالة:", error);
    return { ok: false, error: "تعذّر حذف الرسالة." };
  }

  revalidatePath("/admin/messages");
  return { ok: true };
}
