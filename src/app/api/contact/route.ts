import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { apiError, guardJsonPost, honeypotTripped, internalError } from "@/lib/security/api";
import { contactMessageSchema, fieldErrors } from "@/lib/validation";

/** استقبال رسائل نموذج "اتصل بنا". */
export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await guardJsonPost(request, {
    scope: "contact",
    limit: 5,
    windowMs: 10 * 60 * 1000,
    maxBytes: 16 * 1024,
    rateLimitMessage: "أرسلت عدة رسائل خلال وقت قصير. انتظر قليلاً ثم حاول مرة أخرى.",
  });
  if (!guard.ok) return guard.response;

  // الحقل الفخّ: نجاح ظاهري بلا حفظ (قبل Zod حتى لا يرى الروبوت رسالة خطأ)
  if (honeypotTripped(guard.payload, request, "contact")) {
    return NextResponse.json({ ok: true });
  }

  const parsed = contactMessageSchema.safeParse(guard.payload);

  if (!parsed.success) {
    return apiError(422, "تحقّق من الحقول المطلوبة.", { errors: fieldErrors(parsed.error) });
  }

  const data = parsed.data;

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
    return internalError(
      "contact",
      error,
      "تعذّر إرسال الرسالة. حاول مرة أخرى أو تواصل معنا عبر واتساب.",
    );
  }
}
