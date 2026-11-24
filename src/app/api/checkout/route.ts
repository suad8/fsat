import { NextResponse } from "next/server";

import { createOrder } from "@/lib/orders";
import { apiError, guardJsonPost, honeypotTripped, internalError } from "@/lib/security/api";
import { checkoutSchema, fieldErrors } from "@/lib/validation";

/**
 * إنشاء طلب جديد بعد إعادة تسعيره بالكامل على الخادم.
 *
 * لا يوجد هنا أي مسار يقرأ طلبًا: الاستجابة تحوي رقم طلب العميل نفسه فقط
 * (لا IDOR). أي ميزة "تتبّع الطلب" مستقبلية يجب أن تطلب رقم الطلب + الجوال معًا
 * وتحدّ المعدّل وتردّ برسالة موحّدة (انظر docs/SECURITY.md).
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await guardJsonPost(request, {
    scope: "checkout",
    limit: 10,
    windowMs: 10 * 60 * 1000,
    maxBytes: 128 * 1024,
    rateLimitMessage: "محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.",
  });
  if (!guard.ok) return guard.response;

  if (honeypotTripped(guard.payload, request, "checkout")) {
    return NextResponse.json({ ok: true, orderNumber: "—", total: 0 });
  }

  const parsed = checkoutSchema.safeParse(guard.payload);

  if (!parsed.success) {
    return apiError(422, "تحقّق من البيانات المطلوبة.", { errors: fieldErrors(parsed.error) });
  }

  try {
    const result = await createOrder(parsed.data);

    if (!result.ok) {
      return apiError(422, result.error, {
        errors: result.field ? { [result.field]: result.error } : undefined,
      });
    }

    return NextResponse.json({
      ok: true,
      orderNumber: result.orderNumber,
      total: result.total,
    });
  } catch (error) {
    return internalError("checkout", error, "تعذّر إتمام الطلب. حاول مرة أخرى أو تواصل معنا عبر واتساب.");
  }
}
