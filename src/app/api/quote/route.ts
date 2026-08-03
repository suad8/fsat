import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getQuoteFields, pickAnswer, validateAnswers } from "@/lib/quote-form";
import { generateQuoteReference } from "@/lib/reference";
import { fieldErrors, honeypot, saudiPhone } from "@/lib/validation";

/**
 * استقبال طلبات عروض الأسعار.
 *
 * الحقول الأساسية ثابتة، وبقية الحقول تُقرأ من القالب الذي تحدّده الإدارة في
 * لوحة التحكم ثم يُتحقق منها مقابله — لا نثق بما يصل من المتصفّح حتى لو كان
 * النموذج هو من أرسله.
 *
 * ثلاث طبقات حماية قبل الكتابة في القاعدة:
 *   ١. تحديد معدّل حسب عنوان العميل.
 *   ٢. حقل فخّ مخفي (honeypot) يكشف الإرسال الآلي.
 *   ٣. تحقق كامل — للحقول الثابتة بـ Zod وللمخصّصة مقابل القالب.
 */

const attachment = z.object({
  kind: z.enum(["DESIGN", "LOGO", "REFERENCE"]).default("REFERENCE"),
  name: z.string().trim().min(1).max(255),
  url: z.string().trim().min(1).max(500),
  size: z.number().int().nonnegative(),
  mimeType: z.string().trim().max(120),
});

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
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
  attachments: z.array(attachment).max(10).optional(),
  acceptTerms: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .refine((value) => value === true || value === "on" || value === "true", {
      message: "يجب الموافقة على الشروط والأحكام",
    }),
  website: honeypot,
});

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "quote"), {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: "أرسلت عدة طلبات خلال وقت قصير. انتظر قليلاً ثم حاول مرة أخرى.",
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

  const parsed = coreSchema.safeParse(payload);

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

  // الحقل الفخّ ممتلئ: نردّ بنجاح ظاهري حتى لا يعرف الروبوت أنه كُشف
  if (data.website) {
    return NextResponse.json({ ok: true, reference: "—" });
  }

  // التحقق من الحقول المخصّصة مقابل القالب المحفوظ في القاعدة
  const fields = await getQuoteFields();
  const validated = validateAnswers(fields, data.answers);

  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, message: "تحقّق من الحقول المطلوبة.", errors: validated.errors },
      { status: 422 },
    );
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
    console.error("[quote] فشل حفظ طلب عرض السعر:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "تعذّر حفظ الطلب. حاول مرة أخرى أو تواصل معنا عبر واتساب.",
      },
      { status: 500 },
    );
  }
}

/** يحوّل التسمية العربية المختارة إلى الرمز المخزَّن في العمود. */
function mapContactPreference(value: string | undefined): string {
  if (value?.includes("اتصال")) return "PHONE";
  if (value?.includes("بريد")) return "EMAIL";
  return "WHATSAPP";
}
