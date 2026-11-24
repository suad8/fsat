import { NextResponse } from "next/server";

import { clientKey, rateLimit } from "@/lib/rate-limit";
import { normalizeOrderNumber, orderNumberError, phoneError } from "@/lib/shop/phone";
import { lookupOrder } from "@/lib/shop/tracking";

/**
 * تتبّع الطلب برقم الطلب + الجوال.
 *
 * - لا يُكشف وجود الطلب إلا عند تطابق الاثنين؛ كل فشل يعيد نفس الرسالة ونفس الرمز.
 * - ثلاث طبقات لحدّ المعدّل: للعنوان عمومًا، وللعنوان على الطلب الواحد، وللطلب الواحد
 *   من أي عنوان — فلا يمكن تخمين الجوال (٨ خانات) لطلب معروف الرقم.
 * - لا تُخزَّن الاستجابة في أي ذاكرة وسيطة.
 */

const NOT_FOUND = {
  ok: false,
  message:
    "لم نجد طلبًا بهذه البيانات. تأكد من رقم الطلب ومن أنه الجوال الذي سجّلت به الطلب.",
} as const;

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  const tooMany = (retryAfter: number) =>
    NextResponse.json(
      { ok: false, message: "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة، أو تواصل معنا على واتساب." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(retryAfter) } },
    );

  const ipLimit = rateLimit(clientKey(request, "track"), { limit: 20, windowMs: 10 * 60 * 1000 });
  if (!ipLimit.allowed) return tooMany(ipLimit.retryAfter);

  let body: { orderNumber?: unknown; phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "صيغة الطلب غير صحيحة." }, { status: 400, headers: NO_STORE });
  }

  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber : "";
  const phone = typeof body.phone === "string" ? body.phone : "";

  // أخطاء الصيغة لا تكشف شيئًا عن وجود الطلب
  const errors: Record<string, string> = {};
  const orderIssue = orderNumberError(orderNumber);
  const phoneIssue = phoneError(phone);
  if (orderIssue) errors.orderNumber = orderIssue;
  if (phoneIssue) errors.phone = phoneIssue;
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { ok: false, message: "تحقّق من الحقول.", errors },
      { status: 422, headers: NO_STORE },
    );
  }

  const normalized = normalizeOrderNumber(orderNumber);

  const perOrderIp = rateLimit(clientKey(request, `track:${normalized}`), {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!perOrderIp.allowed) return tooMany(perOrderIp.retryAfter);

  const perOrder = rateLimit(`track-order:${normalized}`, { limit: 30, windowMs: 60 * 60 * 1000 });
  if (!perOrder.allowed) return tooMany(perOrder.retryAfter);

  try {
    const order = await lookupOrder(normalized, phone);
    if (!order) return NextResponse.json(NOT_FOUND, { status: 404, headers: NO_STORE });
    return NextResponse.json({ ok: true, order }, { headers: NO_STORE });
  } catch (error) {
    console.error("[track] فشل البحث:", error);
    return NextResponse.json(
      { ok: false, message: "تعذّر البحث الآن. حاول بعد قليل." },
      { status: 500, headers: NO_STORE },
    );
  }
}
