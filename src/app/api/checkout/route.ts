import { NextResponse } from "next/server";

import { createOrder } from "@/lib/orders";
import { apiError, guardJsonPost, honeypotTripped, internalError } from "@/lib/security/api";
import { getSettings } from "@/lib/settings";
import { initiatePayment, isPaymentAllowed } from "@/lib/shop/payments";
import { absoluteUrl } from "@/lib/utils";
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

  const data = parsed.data;

  try {
    // طريقة الدفع يجب أن تكون مفعّلة فعلاً ومناسبة لطريقة الاستلام
    const settings = await getSettings();
    if (!isPaymentAllowed(settings.payment, data.paymentMethod, data.fulfillment)) {
      return apiError(422, "طريقة الدفع المختارة غير متاحة لهذا الطلب. اختر طريقة أخرى.", {
        errors: { paymentMethod: "اختر طريقة دفع متاحة." },
      });
    }

    const result = await createOrder(data);

    if (!result.ok) {
      return apiError(422, result.error, {
        errors: result.field ? { [result.field]: result.error } : undefined,
      });
    }

    // الطرق الإلكترونية: يعيد المحوّل رابط الدفع. الطرق غير الإلكترونية: لا شيء.
    const payment = await initiatePayment(data.paymentMethod, {
      orderNumber: result.orderNumber,
      total: result.total,
      currency: "SAR",
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      returnUrl: absoluteUrl(`/checkout/success?order=${encodeURIComponent(result.orderNumber)}`),
    });

    return NextResponse.json({
      ok: true,
      orderNumber: result.orderNumber,
      total: result.total,
      payment,
    });
  } catch (error) {
    return internalError("checkout", error, "تعذّر إتمام الطلب. حاول مرة أخرى أو تواصل معنا عبر واتساب.");
  }
}
