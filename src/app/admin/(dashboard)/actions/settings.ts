"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin-context";
import { diffRecords, writeAudit } from "@/lib/data/audit";
import { prisma } from "@/lib/prisma";

/** حفظ بيانات المنشأة وإعدادات الضريبة والدفع وتحسين محركات البحث. */

export type SettingsState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const bankAccountSchema = z.object({
  bankName: z.string().trim().max(80),
  accountName: z.string().trim().max(120),
  iban: z.string().trim().max(40),
});

const settingsSchema = z.object({
  companyName: z.string().trim().min(2, "اسم المنشأة مطلوب").max(160),
  tagline: z.string().trim().max(200).optional(),
  description: z.string().trim().max(600).optional(),

  phone: z.string().trim().max(20).optional(),
  whatsapp: z.string().trim().max(20).optional(),
  landline: z.string().trim().max(20).optional(),
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "صيغة البريد الإلكتروني غير صحيحة",
    }),
  addressLine: z.string().trim().max(240).optional(),
  city: z.string().trim().max(60).optional(),
  mapUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: "الرابط يجب أن يبدأ بـ https://",
    }),
  workingHours: z.string().trim().max(160).optional(),

  vatNumber: z
    .string()
    .trim()
    .max(20)
    .optional()
    .refine((value) => !value || /^\d{15}$/.test(value.replace(/\s/g, "")), {
      message: "الرقم الضريبي يتكوّن من ١٥ رقمًا",
    }),
  crNumber: z.string().trim().max(20).optional(),
  vatRate: z.coerce.number().min(0).max(1),
  pricesIncludeVat: z.boolean(),

  bankTransfer: z.boolean(),
  onlinePayment: z.boolean(),
  cod: z.boolean(),
  onPickup: z.boolean(),
  bankAccounts: z.array(bankAccountSchema).max(5).default([]),

  social: z.object({
    instagram: z.string().trim().max(200).optional(),
    twitter: z.string().trim().max(200).optional(),
    tiktok: z.string().trim().max(200).optional(),
    snapchat: z.string().trim().max(200).optional(),
    linkedin: z.string().trim().max(200).optional(),
    youtube: z.string().trim().max(200).optional(),
  }),

  defaultSeoTitle: z.string().trim().max(160).optional(),
  defaultSeoDescription: z.string().trim().max(400).optional(),

  logoUrl: z.string().trim().max(500).optional(),
  logoWhiteUrl: z.string().trim().max(500).optional(),
});

/**
 * حفظ إعدادات SEO الافتراضية وحدها.
 *
 * منفصل عن saveSettingsAction لأن صفحة SEO لا تعرض بقية الحقول، وإرسالها
 * ناقصة عبر المخطط الكامل كان سيمسح بيانات المنشأة.
 */
export async function saveSeoDefaultsAction(
  _previous: SettingsState,
  form: FormData,
): Promise<SettingsState> {
  let ctx;
  try {
    ctx = await getAdminContext();
  } catch {
    return { error: "انتهت جلستك. أعد تسجيل الدخول." };
  }

  const schema = z.object({
    defaultSeoTitle: z.string().trim().max(160).optional(),
    defaultSeoDescription: z.string().trim().max(400).optional(),
  });

  const parsed = schema.safeParse({
    defaultSeoTitle: form.get("defaultSeoTitle") ?? "",
    defaultSeoDescription: form.get("defaultSeoDescription") ?? "",
  });

  if (!parsed.success) {
    return { error: "تحقّق من طول العنوان والوصف." };
  }

  try {
    const seo = {
      defaultSeoTitle: parsed.data.defaultSeoTitle || null,
      defaultSeoDescription: parsed.data.defaultSeoDescription || null,
    };

    await prisma.$transaction(async (tx) => {
      const existing = await tx.siteSettings.findUnique({ where: { id: "singleton" } });

      await tx.siteSettings.upsert({
        where: { id: "singleton" },
        update: seo,
        create: { id: "singleton", companyName: existing?.companyName ?? "المنشأة", ...seo },
      });

      const changes = diffRecords(existing, seo);
      if (changes) {
        await writeAudit(
          {
            actor: ctx.actor,
            action: "SETTINGS_CHANGE",
            entity: "SiteSettings",
            entityId: "singleton",
            summary: "تعديل إعدادات SEO الافتراضية",
            changes,
            ip: ctx.ip,
          },
          tx,
        );
      }
    });
  } catch (error) {
    console.error("[admin] فشل حفظ إعدادات SEO:", error);
    return { error: "تعذّر الحفظ." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/seo");

  return { ok: true };
}

/** حقول إعدادات حسّاسة يُذكر تغييرها صراحةً في ملخّص سجلّ التدقيق. */
const SENSITIVE_SETTINGS = [
  "vatRate",
  "pricesIncludeVat",
  "vatNumber",
  "crNumber",
  "paymentSettings",
  "phone",
  "whatsapp",
  "email",
] as const;

export async function saveSettingsAction(payload: unknown): Promise<SettingsState> {
  let ctx;
  try {
    ctx = await getAdminContext();
  } catch {
    return { error: "انتهت جلستك. أعد تسجيل الدخول." };
  }

  const parsed = settingsSchema.safeParse(payload);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "تحقّق من الحقول المطلوبة.", fieldErrors };
  }

  const data = parsed.data;

  // روابط التواصل الفارغة تُحذف بدل تخزينها كسلاسل فارغة، فالفوتر يخفي
  // أي حساب غير موجود بدل عرض رابط معطّل
  const social = Object.fromEntries(
    Object.entries(data.social).filter(([, value]) => value && value.trim().length > 0),
  );

  const values = {
    companyName: data.companyName,
    tagline: data.tagline || null,
    description: data.description || null,
    phone: data.phone || null,
    whatsapp: data.whatsapp?.replace(/\D/g, "") || null,
    landline: data.landline || null,
    email: data.email || null,
    addressLine: data.addressLine || null,
    city: data.city || null,
    mapUrl: data.mapUrl || null,
    workingHours: data.workingHours || null,
    vatNumber: data.vatNumber?.replace(/\s/g, "") || null,
    crNumber: data.crNumber || null,
    vatRate: data.vatRate,
    pricesIncludeVat: data.pricesIncludeVat,
    social,
    paymentSettings: {
      bankTransfer: data.bankTransfer,
      online: data.onlinePayment,
      cod: data.cod,
      onPickup: data.onPickup,
      bankAccounts: data.bankAccounts,
    },
    defaultSeoTitle: data.defaultSeoTitle || null,
    defaultSeoDescription: data.defaultSeoDescription || null,
    logoUrl: data.logoUrl || null,
    logoWhiteUrl: data.logoWhiteUrl || null,
  };

  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.siteSettings.findUnique({ where: { id: "singleton" } });

      await tx.siteSettings.upsert({
        where: { id: "singleton" },
        update: values,
        // الإنشاء بكل الحقول (لا بنصفها) حتى لا تضيع بيانات إن غاب السجل
        create: { id: "singleton", ...values },
      });

      const changes = diffRecords(before, values);
      if (changes) {
        const sensitive = SENSITIVE_SETTINGS.filter((field) => field in changes);
        await writeAudit(
          {
            actor: ctx.actor,
            action: "SETTINGS_CHANGE",
            entity: "SiteSettings",
            entityId: "singleton",
            summary:
              sensitive.length > 0
                ? `تعديل إعدادات المنشأة (حسّاسة: ${sensitive.join("، ")})`
                : "تعديل إعدادات المنشأة",
            changes,
            ip: ctx.ip,
          },
          tx,
        );
      }
    });
  } catch (error) {
    console.error("[admin] فشل حفظ الإعدادات:", error);
    return { error: "تعذّر حفظ الإعدادات." };
  }

  // الإعدادات تظهر في الترويسة والفوتر وكل الصفحات
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");

  return { ok: true };
}
