"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin-context";
import { diffRecords, writeAudit } from "@/lib/data/audit";
import { prisma } from "@/lib/prisma";
import { isThemeFont, parseHex, THEME_RADII } from "@/lib/theme";

/** حفظ ألوان الثيم وخطّه وأقسام الصفحة الرئيسية. */

type Result = { ok: boolean; error?: string };

const hex = z
  .string()
  .trim()
  .refine((value) => parseHex(value) !== null, "صيغة اللون غير صحيحة");

const themeSchema = z.object({
  primary: hex,
  accent: hex,
  brand: hex,
  font: z.string().refine(isThemeFont, "خط غير معروف"),
  radius: z.enum(
    THEME_RADII.map((entry) => entry.key) as [string, ...string[]],
    { message: "قيمة انحناء غير معروفة" },
  ),
});

export async function saveThemeAction(payload: unknown): Promise<Result> {
  let ctx;
  try {
    ctx = await getAdminContext();
  } catch {
    return { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." };
  }

  const parsed = themeSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "قيم غير صالحة." };
  }

  const data = parsed.data;

  const theme = {
    themePrimary: data.primary,
    themeAccent: data.accent,
    themeBrand: data.brand,
    themeFont: data.font,
    themeRadius: data.radius,
  };

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.siteSettings.findUnique({ where: { id: "singleton" } });

      await tx.siteSettings.upsert({
        where: { id: "singleton" },
        update: theme,
        create: { id: "singleton", companyName: existing?.companyName ?? "المنشأة", ...theme },
      });

      const changes = diffRecords(existing, theme);
      if (changes) {
        await writeAudit(
          {
            actor: ctx.actor,
            action: "SETTINGS_CHANGE",
            entity: "SiteSettings",
            entityId: "singleton",
            summary: "تعديل ثيم الموقع (الألوان/الخط/الانحناء)",
            changes,
            ip: ctx.ip,
          },
          tx,
        );
      }
    });
  } catch (error) {
    console.error("[theme] فشل حفظ الثيم:", error);
    return { ok: false, error: "تعذّر حفظ الثيم." };
  }

  // الثيم يُحقن في التخطيط الجذري، فكل الصفحات تحتاج إعادة توليد
  revalidatePath("/", "layout");
  return { ok: true };
}

const sectionsSchema = z.array(
  z.object({
    key: z.string().trim().min(1).max(40),
    isActive: z.boolean(),
    order: z.number().int().min(0).max(99),
    eyebrow: z.string().trim().max(60).nullable(),
    title: z.string().trim().max(160).nullable(),
    description: z.string().trim().max(400).nullable(),
  }),
);

export async function saveSectionsAction(payload: unknown): Promise<Result> {
  let ctx;
  try {
    ctx = await getAdminContext();
  } catch {
    return { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." };
  }

  const parsed = sectionsSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: "بيانات الأقسام غير صالحة." };
  }

  try {
    // المفاتيح موجودة مسبقًا (تُنشأ من التهيئة)، فنحدّث فقط ولا ننشئ مفاتيح
    // جديدة من مدخلات المستخدم — القسم بلا مكوّن في الكود لن يُرسم
    await prisma.$transaction(async (tx) => {
      const before = await tx.homeSection.findMany();
      const previous = new Map(before.map((section) => [section.key, section]));

      const changes: Record<string, unknown> = {};

      for (const section of parsed.data) {
        const next = {
          isActive: section.isActive,
          order: section.order,
          eyebrow: section.eyebrow || null,
          title: section.title || null,
          description: section.description || null,
        };

        await tx.homeSection.updateMany({ where: { key: section.key }, data: next });

        const diff = diffRecords(previous.get(section.key), next);
        if (diff) changes[section.key] = diff;
      }

      if (Object.keys(changes).length > 0) {
        await writeAudit(
          {
            actor: ctx.actor,
            action: "UPDATE",
            entity: "HomeSection",
            summary: `تعديل أقسام الصفحة الرئيسية (${Object.keys(changes).join("، ")})`,
            changes,
            ip: ctx.ip,
          },
          tx,
        );
      }
    });
  } catch (error) {
    console.error("[theme] فشل حفظ الأقسام:", error);
    return { ok: false, error: "تعذّر حفظ ترتيب الأقسام." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
