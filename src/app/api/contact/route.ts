import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { contactMessageSchema, fieldErrors } from "@/lib/validation";

/** استقبال رسائل نموذج "اتصل بنا". */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "contact"), {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: "أرسلت عدة رسائل خلال وقت قصير. انتظر قليلاً ثم حاول مرة أخرى.",
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "صيغة الطلب غير صحيحة." },
      { status: 400 },
    );
  }

  const parsed = contactMessageSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "تحقّق من الحقول المطلوبة.",
        errors: fieldErrors(parsed.error),
      },
      { status: 422 },
    );
  }

  const data = parsed.data;

  if (data.website) {
    return NextResponse.json({ ok: true });
  }

  try {
    await prisma.contactMessage.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        subject: data.subject,
        message: data.message,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[contact] فشل حفظ الرسالة:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "تعذّر إرسال الرسالة. حاول مرة أخرى أو تواصل معنا عبر واتساب.",
      },
      { status: 500 },
    );
  }
}
