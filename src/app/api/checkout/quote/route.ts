import { NextResponse } from "next/server";

import { clientKey, rateLimit } from "@/lib/rate-limit";
import { cartQuoteSchema, quoteCart } from "@/lib/shop/quote";

/**
 * معاينة السلة: أسعار محقَّقة + شحن + ضريبة + كوبون، بلا إنشاء طلب.
 * يُستدعى من السلة والدفع أثناء الكتابة، لذا حدّه أوسع من حدّ إنشاء الطلب.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "checkout-quote"), {
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: "طلبات كثيرة خلال وقت قصير. انتظر قليلًا." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "صيغة الطلب غير صحيحة." }, { status: 400 });
  }

  const parsed = cartQuoteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "بيانات السلة غير صالحة." }, { status: 422 });
  }

  try {
    const quote = await quoteCart(parsed.data);
    return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[checkout/quote] فشل الحساب:", error);
    return NextResponse.json(
      { ok: false, message: "تعذّر حساب الطلب الآن. حاول بعد قليل." },
      { status: 500 },
    );
  }
}
