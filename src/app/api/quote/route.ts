import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { apiError, guardJsonPost, honeypotTripped, internalError } from "@/lib/security/api";
import { getQuoteFields, pickAnswer, validateAnswers } from "@/lib/quote-form";
import { generateQuoteReference } from "@/lib/reference";
import { attachmentSchema, fieldErrors, honeypot, saudiPhone } from "@/lib/validation";

/**
 * استقبال طلبات عروض الأسعار.
 *
 * الحقول الأساسية ثابتة، وبقية الحقول تُقرأ من القالب الذي تحدّده الإدارة في
 * لوحة التحكم ثم يُتحقق منها مقابله — لا نثق بما يصل من المتصفّح حتى لو كان
 * النموذج هو من أرسله.
 *
 * طبقات الحماية قبل الكتابة في القاعدة (الحارس في src/lib/security/api.ts):
 *   ١. فحص الأصل + نوع المحتوى JSON + سقف لحجم الجسم.
 *   ٢. تحديد معدّل حسب عنوان العميل.
 *   ٣. حقل فخّ مخفي (honeypot) يكشف الإرسال الآلي.
 *   ٤. تحقق كامل — للحقول الثابتة بـ Zod وللمخصّصة مقابل القالب، وروابط المرفقات
 *      لا تُقبل إلا بشكل ما يولّده مسار الرفع (لا javascript: ولا روابط خارجية).
 */

const coreSchema = z.object({
  customerName: z.string().trim().min(2, "الاسم قصير جدًا").max(80),
  phone: saudiPhone,
  city: z.string().trim().min(2, "المدينة مطلوبة").max(60),
  description: z
    .string()
    .trim()
    .min(10, "اكتب وصفًا للطلب لا يقل عن ١٠ أحرف")
    .max(2000, "الوصف طويل جدًا"),
  productSlug: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  // الإجابات المخصّصة: حدود على عدد المفاتيح وأطوالها (الجسم نفسه محدود بـ ٦٤ك)
  answers: z
    .record(
      z.string().max(64),
      z.union([z.string().max(2000), z.array(z.string().max(300)).max(60)]),
    )
    .refine((value) => Object.keys(value).length <= 60, "عدد الإجابات كبير جدًا")
    .default({}),
  attachments: z.array(attachmentSchema).max(10).optional(),
  acceptTerms: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .refine((value) => value === true || value === "on" || value === "true", {
      message: "يجب الموافقة على الشروط والأحكام",
    }),
  website: honeypot,
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await guardJsonPost(request, {
    scope: "quote",
    limit: 5,
    windowMs: 10 * 60 * 1000,
    maxBytes: 64 * 1024,
    rateLimitMessage: "أرسلت عدة طلبات خلال وقت قصير. انتظر قليلاً ثم حاول مرة أخرى.",
  });
  if (!guard.ok) return guard.response;

  // الحقل الفخّ ممتلئ: نردّ بنجاح ظاهري حتى لا يعرف الروبوت أنه كُشف
  if (honeypotTripped(guard.payload, request, "quote")) {
    return NextResponse.json({ ok: true, reference: "—" });
  }

  const parsed = coreSchema.safeParse(guard.payload);

  if (!parsed.success) {
    return apiError(422, "تحقّق من الحقول المطلوبة.", { errors: fieldErrors(parsed.error) });
  }

  const data = parsed.data;

  // التحقق من الحقول المخصّصة مقابل القالب المحفوظ في القاعدة
  const fields = await getQuoteFields();
  const validated = validateAnswers(fields, data.answers);

  if (!validated.ok) {
    return apiError(422, "تحقّق من الحقول المطلوبة.", { errors: validated.errors });
  }

  const answers = validated.answers;

  try {
    const reference = await generateQuoteReference();

    // حقول النظام تُخزَّن في أعمدتها المخصّصة أيضًا حتى تبقى قابلة للفلترة
    // والعرض في جداول لوحة التحكم، وليس داخل JSON فقط
    const dueDateRaw = pickAnswer(answers, "dueDate");

    await prisma.quoteRequest.create({
      data: {
        reference,
        customerName: data.customerName,
        phone: data.phone,
        city: data.city,
        description: data.description,
        productSlug: data.productSlug,

        companyName: pickAnswer(answers, "companyName"),
        email: pickAnswer(answers, "email"),
        productType: pickAnswer(answers, "productType") ?? "غير محدّد",
        size: pickAnswer(answers, "size"),
        quantity: pickAnswer(answers, "quantity"),
        dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
        preferredContact: mapContactPreference(pickAnswer(answers, "preferredContact")),

        // كل الإجابات تُحفظ كاملة بتسمياتها — بما فيها الحقول التي أضافتها
        // الإدارة ولا يوجد لها عمود
        customFields: answers,
        attachments: data.attachments ?? [],
      },
    });

    return NextResponse.json({ ok: true, reference });
  } catch (error) {
    return internalError(
      "quote",
      error,
      "تعذّر حفظ الطلب. حاول مرة أخرى أو تواصل معنا عبر واتساب.",
    );
  }
}

/** يحوّل التسمية العربية المختارة إلى الرمز المخزَّن في العمود. */
function mapContactPreference(value: string | undefined): string {
  if (value?.includes("اتصال")) return "PHONE";
  if (value?.includes("بريد")) return "EMAIL";
  return "WHATSAPP";
}
