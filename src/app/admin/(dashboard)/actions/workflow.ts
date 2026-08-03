"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import {
  MESSAGE_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  QUOTE_STATUSES,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/**
 * تحديث حالات الطلبات وعروض الأسعار والرسائل.
 *
 * كل قيمة حالة تُفحص مقابل قائمتها المغلقة قبل الكتابة — SQLite لا يفرض
 * enum على مستوى القاعدة، فالفحص هنا هو ما يمنع كتابة حالة غير معروفة تكسر
 * عرض الشارات لاحقًا.
 */

type Result = { ok: boolean; error?: string };

async function guard(): Promise<Result | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." };
  }
}

// ---------------------------------------------------------------------------
// الطلبات
// ---------------------------------------------------------------------------

export async function updateOrderAction(
  id: string,
  changes: { status?: string; paymentStatus?: string; adminNotes?: string },
): Promise<Result> {
  const denied = await guard();
  if (denied) return denied;

  const data: Record<string, string> = {};

  if (changes.status !== undefined) {
    if (!(ORDER_STATUSES as readonly string[]).includes(changes.status)) {
      return { ok: false, error: "حالة طلب غير معروفة." };
    }
    data.status = changes.status;
  }

  if (changes.paymentStatus !== undefined) {
    if (!(PAYMENT_STATUSES as readonly string[]).includes(changes.paymentStatus)) {
      return { ok: false, error: "حالة دفع غير معروفة." };
    }
    data.paymentStatus = changes.paymentStatus;
  }

  if (changes.adminNotes !== undefined) {
    data.adminNotes = changes.adminNotes.slice(0, 2000);
  }

  if (Object.keys(data).length === 0) return { ok: true };

  try {
    await prisma.order.update({ where: { id }, data });
  } catch (error) {
    console.error("[admin] فشل تحديث الطلب:", error);
    return { ok: false, error: "تعذّر تحديث الطلب." };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// عروض الأسعار
// ---------------------------------------------------------------------------

export async function updateQuoteAction(
  id: string,
  changes: { status?: string; quotedAmount?: number | null; adminNotes?: string },
): Promise<Result> {
  const denied = await guard();
  if (denied) return denied;

  const data: Record<string, unknown> = {};

  if (changes.status !== undefined) {
    if (!(QUOTE_STATUSES as readonly string[]).includes(changes.status)) {
      return { ok: false, error: "حالة غير معروفة." };
    }
    data.status = changes.status;
  }

  if (changes.quotedAmount !== undefined) {
    if (changes.quotedAmount !== null && !Number.isFinite(changes.quotedAmount)) {
      return { ok: false, error: "قيمة العرض غير صحيحة." };
    }
    data.quotedAmount = changes.quotedAmount;
  }

  if (changes.adminNotes !== undefined) {
    data.adminNotes = changes.adminNotes.slice(0, 2000);
  }

  if (Object.keys(data).length === 0) return { ok: true };

  try {
    await prisma.quoteRequest.update({ where: { id }, data });
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
  const denied = await guard();
  if (denied) return denied;

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
  const denied = await guard();
  if (denied) return denied;

  try {
    await prisma.contactMessage.delete({ where: { id } });
  } catch (error) {
    console.error("[admin] فشل حذف الرسالة:", error);
    return { ok: false, error: "تعذّر حذف الرسالة." };
  }

  revalidatePath("/admin/messages");
  return { ok: true };
}
