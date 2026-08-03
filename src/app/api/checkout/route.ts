import { NextResponse } from "next/server";

import { createOrder } from "@/lib/orders";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { checkoutSchema, fieldErrors } from "@/lib/validation";

/** إنشاء طلب جديد بعد إعادة تسعيره بالكامل على الخادم. */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "checkout"), {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: "محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "صيغة الطلب غير صحيحة." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "تحقّق من البيانات المطلوبة.",
        errors: fieldErrors(parsed.error),
      },
      { status: 422 },
    );
  }

  const data = parsed.data;

  if (data.website) {
    return NextResponse.json({ ok: true, orderNumber: "—", total: 0 });
  }

  const result = await createOrder(data);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: result.error,
        errors: result.field ? { [result.field]: result.error } : undefined,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    orderNumber: result.orderNumber,
    total: result.total,
  });
}
