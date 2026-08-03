import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { getQuoteSubjects } from "@/lib/queries";
import {
  CHOICE_FIELD_TYPES,
  type QuoteAnswer,
  type QuoteField,
  type QuoteFieldType,
} from "@/lib/quote-form-types";

/**
 * قالب نموذج طلب عرض السعر — الجانب الخادمي.
 *
 * ⚠️ هذا الملف يستورد Prisma، فلا تستورده من مكوّن عميل. الأنواع والثوابت
 *    في src/lib/quote-form-types.ts وهي آمنة للعميل.
 *
 * الحقول تُقرأ من قاعدة البيانات لا من الكود، فتستطيع الإدارة تخصيص النموذج
 * بالكامل من لوحة التحكم. تبقى أربعة حقول أساسية مثبّتة في الكود عمدًا:
 * الاسم والجوال والمدينة ووصف الطلب — عرض سعر بلا وسيلة تواصل أو بلا وصف
 * لا قيمة له، وإخفاؤها بالخطأ يُفقد الشركة طلبات.
 */

export type { QuoteField, QuoteFieldType, QuoteAnswer };
export { CHOICE_FIELD_TYPES };

/**
 * الحقول الظاهرة في النموذج، مرتّبة.
 *
 * حقل `productType` حالة خاصة: إن تركت الإدارة خياراته فارغة تُملأ تلقائيًا
 * من الخدمات وأقسام المنتجات، فلا تحتاج لتحديثه يدويًا كلما أُضيفت خدمة.
 */
export const getQuoteFields = cache(async (): Promise<QuoteField[]> => {
  const [rows, subjects] = await Promise.all([
    prisma.quoteFormField.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    getQuoteSubjects(),
  ]);

  return rows.map((row) => {
    const stored = Array.isArray(row.options) ? (row.options as string[]) : [];

    const options =
      row.key === "productType" && stored.length === 0
        ? [...subjects, "أخرى — سأوضّح في الوصف"]
        : stored;

    return {
      id: row.id,
      key: row.key,
      label: row.label,
      type: row.type as QuoteFieldType,
      placeholder: row.placeholder,
      helpText: row.helpText,
      isRequired: row.isRequired,
      isSystem: row.isSystem,
      width: row.width === "FULL" ? "FULL" : "HALF",
      options,
    };
  });
});

/**
 * تحقق من الإجابات مقابل القالب المعرّف في القاعدة.
 *
 * يُنفَّذ على الخادم دائمًا: قائمة الحقول تصل للمتصفّح، ولا شيء يمنع إرسال
 * طلب مباشر إلى الـ API يتجاوز النموذج.
 */
export function validateAnswers(
  fields: QuoteField[],
  incoming: Record<string, unknown>,
): { ok: true; answers: QuoteAnswer[] } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const answers: QuoteAnswer[] = [];

  for (const field of fields) {
    const raw = incoming[field.key];

    const value = Array.isArray(raw)
      ? raw.filter((item): item is string => typeof item === "string").join("، ")
      : typeof raw === "string"
        ? raw.trim()
        : "";

    if (!value) {
      if (field.isRequired) errors[field.key] = `${field.label} مطلوب`;
      continue;
    }

    if (value.length > 1000) {
      errors[field.key] = `${field.label} طويل جدًا`;
      continue;
    }

    // القيم المختارة يجب أن تكون من القائمة المعرّفة — يمنع حقن قيم عشوائية
    if (CHOICE_FIELD_TYPES.includes(field.type) && field.options.length > 0) {
      const picked = value.split("، ");
      const invalid = picked.filter((item) => !field.options.includes(item));
      if (invalid.length > 0) {
        errors[field.key] = `قيمة غير صالحة في ${field.label}`;
        continue;
      }
    }

    if (field.type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field.key] = "صيغة البريد الإلكتروني غير صحيحة";
      continue;
    }

    if (field.type === "NUMBER" && Number.isNaN(Number(value))) {
      errors[field.key] = `${field.label} يجب أن يكون رقمًا`;
      continue;
    }

    if (field.type === "DATE" && Number.isNaN(Date.parse(value))) {
      errors[field.key] = `صيغة التاريخ في ${field.label} غير صحيحة`;
      continue;
    }

    answers.push({ key: field.key, label: field.label, value });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, answers };
}

/** يستخرج قيمة حقل نظام من الإجابات لتخزينها في عمودها المخصّص. */
export function pickAnswer(answers: QuoteAnswer[], key: string): string | undefined {
  return answers.find((answer) => answer.key === key)?.value || undefined;
}
