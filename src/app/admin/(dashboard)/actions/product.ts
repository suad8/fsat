"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { OPTION_PRICE_MODES, OPTION_TYPES, PRICE_MODES } from "@/lib/constants";
import { getAdminContext, type AdminContext } from "@/lib/data/admin-context";
import { diffRecords, logAudit, writeAudit } from "@/lib/data/audit";
import { MAX_MONEY, roundMoney } from "@/lib/data/money";
import { MAX_ORDER_QUANTITY } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/**
 * حفظ المنتج بخياراته وشرائح أسعاره وصوره.
 *
 * الصفوف المتفرّعة (الخيارات، الشرائح، الصور) تُحذف وتُعاد كتابتها بالكامل
 * داخل معاملة واحدة بدل مطابقتها صفًا بصف. هذا آمن هنا لأن بنود الطلبات
 * تحتفظ بلقطة من الخيارات المختارة وقت الطلب ولا ترتبط بمعرّفاتها، فحذف
 * قيمة خيار لا يؤثر على أي طلب سابق.
 *
 * كل حفظ/حذف يُسجَّل في AuditLog داخل المعاملة نفسها، وتُقرَّب كل المبالغ
 * لأقرب هللة قبل الكتابة (src/lib/data/money.ts).
 */

const money = z.coerce.number().finite().min(0).max(MAX_MONEY);

const optionValueSchema = z.object({
  label: z.string().trim().min(1, "اسم الخيار مطلوب").max(120),
  value: z.string().trim().max(120).optional(),
  // موجب أو سالب (خصم)؛ المضاعِف معامل لا مبلغ فيُقرَّب لأربع منازل لا لهللتين
  priceModifier: z.coerce.number().finite().min(-MAX_MONEY).max(MAX_MONEY).default(0),
  priceMode: z.enum(OPTION_PRICE_MODES).default("ADD_PER_UNIT"),
  swatchHex: z.string().trim().max(9).optional().nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const optionGroupSchema = z.object({
  name: z.string().trim().min(1, "اسم المجموعة مطلوب").max(120),
  key: z.string().trim().max(60).optional(),
  type: z.enum(OPTION_TYPES).default("SELECT"),
  helpText: z.string().trim().max(400).optional().nullable(),
  isRequired: z.boolean().default(true),
  values: z.array(optionValueSchema).max(60).default([]),
});

const tierSchema = z.object({
  minQty: z.coerce.number().int().positive("الحد الأدنى يجب أن يكون أكبر من صفر").max(MAX_ORDER_QUANTITY),
  maxQty: z.coerce.number().int().positive().max(MAX_ORDER_QUANTITY).nullable().optional(),
  unitPrice: money,
  label: z.string().trim().max(120).optional().nullable(),
});

const imageSchema = z.object({
  url: z.string().trim().min(1),
  alt: z.string().trim().min(1, "النص البديل مطلوب لكل صورة").max(200),
});

const productSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2, "اسم المنتج مطلوب").max(160),
  slug: z.string().trim().max(160).optional(),
  shortDescription: z.string().trim().max(400).optional().nullable(),
  description: z.string().trim().max(6000).optional().nullable(),
  categoryId: z.string().trim().min(1, "اختر القسم"),
  priceMode: z.enum(PRICE_MODES).default("FIXED"),
  basePrice: money.default(0),
  compareAtPrice: money.nullable().optional(),
  unit: z.string().trim().min(1).max(40).default("قطعة"),
  minQuantity: z.coerce.number().int().positive().max(MAX_ORDER_QUANTITY).default(1),
  quantityStep: z.coerce.number().int().positive().max(MAX_ORDER_QUANTITY).default(1),
  sku: z.string().trim().max(60).optional().nullable(),
  leadTime: z.string().trim().max(120).optional().nullable(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  order: z.coerce.number().int().default(0),
  seoTitle: z.string().trim().max(160).optional().nullable(),
  seoDescription: z.string().trim().max(400).optional().nullable(),
  images: z.array(imageSchema).max(12).default([]),
  optionGroups: z.array(optionGroupSchema).max(15).default([]),
  quantityTiers: z.array(tierSchema).max(12).default([]),
  serviceIds: z.array(z.string()).default([]),
});

export type ProductActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; issues?: string[] };

const AUDITED_FIELDS = [
  "name",
  "slug",
  "categoryId",
  "priceMode",
  "basePrice",
  "compareAtPrice",
  "unit",
  "minQuantity",
  "quantityStep",
  "sku",
  "isActive",
  "isFeatured",
  "order",
  "leadTime",
  "shortDescription",
  "description",
  "seoTitle",
  "seoDescription",
] as const;

/** ملخّص نصّي لكل ما يؤثر على السعر — يُقارَن قبل/بعد في سجلّ التدقيق. */
function pricingSummary(product: {
  quantityTiers: { minQty: number; maxQty: number | null; unitPrice: number }[];
  optionGroups: {
    key: string;
    isRequired: boolean;
    values: { value: string; priceModifier: number; priceMode: string; isActive: boolean }[];
  }[];
}): string {
  const tiers = [...product.quantityTiers]
    .sort((a, b) => a.minQty - b.minQty)
    .map((tier) => `${tier.minQty}-${tier.maxQty ?? "∞"}:${tier.unitPrice}`)
    .join(" | ");

  const options = product.optionGroups
    .map(
      (group) =>
        `${group.key}${group.isRequired ? "*" : ""}[${group.values
          .map(
            (value) =>
              `${value.value}=${value.priceModifier}/${value.priceMode}${value.isActive ? "" : "(off)"}`,
          )
          .join(", ")}]`,
    )
    .join(" ; ");

  return `شرائح: ${tiers || "—"} || خيارات: ${options || "—"}`;
}

async function guard(): Promise<{ ctx: AdminContext } | { error: string }> {
  try {
    return { ctx: await getAdminContext() };
  } catch {
    return { error: "انتهت جلستك. أعد تسجيل الدخول." };
  }
}

export async function saveProductAction(payload: unknown): Promise<ProductActionResult> {
  const auth = await guard();
  if ("error" in auth) return { ok: false, error: auth.error };
  const { ctx } = auth;

  const parsed = productSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      error: "تحقّق من الحقول المطلوبة.",
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const data = parsed.data;
  const slug = slugify(data.slug || data.name);

  if (!slug) return { ok: false, error: "تعذّر توليد رابط صالح من اسم المنتج." };

  const basePrice = roundMoney(data.basePrice);
  // صفر أو فراغ = لا يوجد سعر قبل الخصم
  const rawCompare = data.compareAtPrice != null ? roundMoney(data.compareAtPrice) : 0;
  const compareAtPrice = rawCompare > 0 ? rawCompare : null;

  if (compareAtPrice !== null && compareAtPrice <= basePrice && data.priceMode !== "QUOTE_ONLY") {
    return {
      ok: false,
      error: "السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي، أو اتركه فارغًا.",
    };
  }

  // الشرائح يجب ألا تتداخل، وإلا أصبح سعر الكمية الواحدة غامضًا
  const sortedTiers = [...data.quantityTiers].sort((a, b) => a.minQty - b.minQty);
  for (let index = 0; index < sortedTiers.length; index += 1) {
    const current = sortedTiers[index];

    if (current.maxQty != null && current.maxQty < current.minQty) {
      return {
        ok: false,
        error: `في الشريحة التي تبدأ من ${current.minQty}: الحد الأعلى أصغر من الأدنى.`,
      };
    }

    if (index === 0) continue;
    const previous = sortedTiers[index - 1];

    if (current.minQty === previous.minQty) {
      return { ok: false, error: `شريحتان تبدآن من الكمية نفسها (${current.minQty}).` };
    }
    if (previous.maxQty == null) {
      return {
        ok: false,
        error: "الشريحة المفتوحة (بلا حد أعلى) يجب أن تكون الأخيرة.",
      };
    }
    if (current.minQty <= previous.maxQty) {
      return {
        ok: false,
        error: `شرائح الكميات متداخلة: الشريحة التي تبدأ من ${current.minQty} تتقاطع مع التي قبلها.`,
      };
    }
  }

  // مفاتيح المجموعات فريدة داخل المنتج، وقيم المجموعة الواحدة غير مكرّرة
  const groupKeys = new Set<string>();
  const groups = data.optionGroups.map((group, groupIndex) => ({
    ...group,
    key: group.key?.trim() || slugify(group.name) || `option-${groupIndex + 1}`,
  }));

  for (const group of groups) {
    if (groupKeys.has(group.key)) {
      return {
        ok: false,
        error: `يوجد مفتاحان متطابقان لمجموعتي خيارات («${group.key}»). غيّر مفتاح إحداهما.`,
      };
    }
    groupKeys.add(group.key);

    const seen = new Set<string>();
    for (const value of group.values) {
      const stored = value.value?.trim() || value.label;
      if (seen.has(stored)) {
        return {
          ok: false,
          error: `المجموعة «${group.name}» فيها خياران بالقيمة نفسها («${stored}»).`,
        };
      }
      seen.add(stored);

      if (value.priceMode === "MULTIPLY" && value.priceModifier <= 0) {
        return {
          ok: false,
          error: `معامل الضرب في «${group.name}: ${value.label}» يجب أن يكون أكبر من صفر (١٫٢٥ = زيادة ٢٥٪).`,
        };
      }
    }

    if (group.values.filter((value) => value.isDefault).length > 1 && group.type !== "CHECKBOX") {
      return { ok: false, error: `المجموعة «${group.name}» فيها أكثر من خيار افتراضي.` };
    }
  }

  const base = {
    name: data.name,
    slug,
    shortDescription: data.shortDescription || null,
    description: data.description || null,
    categoryId: data.categoryId,
    priceMode: data.priceMode,
    basePrice,
    compareAtPrice,
    unit: data.unit,
    minQuantity: data.minQuantity,
    quantityStep: data.quantityStep,
    sku: data.sku || null,
    leadTime: data.leadTime || null,
    isActive: data.isActive,
    isFeatured: data.isFeatured,
    order: data.order,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    // حفظ الإدارة = مراجعة: تزول علامة "بيانات مبدئية"
    needsReview: false,
  };

  const nested = {
    images: {
      create: data.images.map((image, index) => ({
        url: image.url,
        alt: image.alt,
        order: index,
      })),
    },
    quantityTiers: {
      create: sortedTiers.map((tier, index) => ({
        minQty: tier.minQty,
        maxQty: tier.maxQty ?? null,
        unitPrice: roundMoney(tier.unitPrice),
        label: tier.label || null,
        order: index,
      })),
    },
    optionGroups: {
      create: groups.map((group, groupIndex) => ({
        name: group.name,
        key: group.key,
        type: group.type,
        helpText: group.helpText || null,
        isRequired: group.isRequired,
        order: groupIndex,
        values: {
          create: group.values.map((value, valueIndex) => ({
            label: value.label,
            value: value.value?.trim() || value.label,
            priceModifier:
              value.priceMode === "MULTIPLY"
                ? Math.round(value.priceModifier * 10_000) / 10_000
                : roundMoney(value.priceModifier),
            priceMode: value.priceMode,
            swatchHex: value.swatchHex || null,
            isDefault: value.isDefault,
            isActive: value.isActive,
            order: valueIndex,
          })),
        },
      })),
    },
  };

  const serviceLinks = data.serviceIds.map((id) => ({ id }));

  try {
    let productId = data.id;

    if (productId) {
      const id = productId;
      const before = await prisma.product.findUnique({
        where: { id },
        include: { quantityTiers: true, optionGroups: { include: { values: true } } },
      });
      if (!before) return { ok: false, error: "المنتج غير موجود." };

      await prisma.$transaction(async (tx) => {
        // الحذف قبل إعادة الإنشاء — أبسط وأدق من مطابقة الصفوف واحدًا واحدًا
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.quantityTier.deleteMany({ where: { productId: id } });
        await tx.optionGroup.deleteMany({ where: { productId: id } });

        const after = await tx.product.update({
          where: { id },
          // set يستبدل قائمة الخدمات المرتبطة بالكامل
          data: { ...base, ...nested, services: { set: serviceLinks } },
          include: { quantityTiers: true, optionGroups: { include: { values: true } } },
        });

        const changes = diffRecords(before, base, { fields: AUDITED_FIELDS }) ?? {};
        const pricingBefore = pricingSummary(before);
        const pricingAfter = pricingSummary(after);
        if (pricingBefore !== pricingAfter) {
          changes.pricing = { from: pricingBefore, to: pricingAfter };
        }

        await writeAudit(
          {
            actor: ctx.actor,
            action: "UPDATE",
            entity: "Product",
            entityId: id,
            summary: `تعديل المنتج «${data.name}»${changes.pricing || changes.basePrice ? " (تغيّر السعر)" : ""}`,
            changes: Object.keys(changes).length > 0 ? changes : null,
            ip: ctx.ip,
          },
          tx,
        );
      });
    } else {
      const created = await prisma.$transaction(async (tx) => {
        // connect عند الإنشاء — لا توجد روابط سابقة لاستبدالها
        const record = await tx.product.create({
          data: { ...base, ...nested, services: { connect: serviceLinks } },
        });

        await writeAudit(
          {
            actor: ctx.actor,
            action: "CREATE",
            entity: "Product",
            entityId: record.id,
            summary: `إنشاء المنتج «${data.name}»`,
            changes: {
              slug,
              priceMode: base.priceMode,
              basePrice,
              tiers: sortedTiers.length,
              optionGroups: groups.length,
            },
            ip: ctx.ip,
          },
          tx,
        );

        return record;
      });
      productId = created.id;
    }

    revalidatePath("/admin/products");
    revalidatePath("/", "layout");

    return { ok: true, id: productId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("Unique constraint") || message.includes("P2002")) {
      if (/sku/i.test(message)) return { ok: false, error: "رمز المنتج (SKU) مستخدم لمنتج آخر." };
      if (/key/i.test(message) && /OptionGroup|productId/i.test(message)) {
        return {
          ok: false,
          error: "يوجد مفتاحان متطابقان لمجموعتي خيارات. غيّر مفتاح إحداهما.",
        };
      }
      return { ok: false, error: "رابط المنتج (slug) مستخدم لمنتج آخر." };
    }

    console.error("[admin] فشل حفظ المنتج:", error);
    return { ok: false, error: "تعذّر حفظ المنتج. حاول مرة أخرى." };
  }
}

export async function deleteProductAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await guard();
  if ("error" in auth) return { ok: false, error: auth.error };
  const { ctx } = auth;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { name: true, slug: true, isActive: true },
    });
    if (!product) return { ok: false, error: "المنتج غير موجود." };

    // المنتج المرتبط بطلبات لا يُحذف — نخفيه بدل ذلك حتى يبقى سجل الطلبات سليمًا
    const orderItems = await prisma.orderItem.count({ where: { productId: id } });

    if (orderItems > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      await logAudit({
        actor: ctx.actor,
        action: "UPDATE",
        entity: "Product",
        entityId: id,
        summary: `إخفاء المنتج «${product.name}» بدل حذفه (مرتبط بـ ${orderItems} بند طلب)`,
        changes: { isActive: { from: product.isActive, to: false } },
        ip: ctx.ip,
      });
      revalidatePath("/admin/products");
      revalidatePath("/", "layout");
      return {
        ok: false,
        error:
          "هذا المنتج مرتبط بطلبات سابقة، فأُخفي من الموقع بدل حذفه حتى تبقى سجلات الطلبات صحيحة.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.delete({ where: { id } });
      await writeAudit(
        {
          actor: ctx.actor,
          action: "DELETE",
          entity: "Product",
          entityId: id,
          summary: `حذف المنتج «${product.name}»`,
          changes: { name: product.name, slug: product.slug },
          ip: ctx.ip,
        },
        tx,
      );
    });
  } catch (error) {
    console.error("[admin] فشل حذف المنتج:", error);
    return { ok: false, error: "تعذّر حذف المنتج." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleProductFieldAction(
  id: string,
  field: "isActive" | "isFeatured",
  value: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await guard();
  if ("error" in auth) return { ok: false, error: auth.error };
  const { ctx } = auth;

  // الحقل يأتي من العميل: نحصره بالقائمة المغلقة قبل استعماله اسمًا لعمود
  if (field !== "isActive" && field !== "isFeatured") {
    return { ok: false, error: "حقل غير مسموح." };
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: { [field]: Boolean(value) },
      select: { name: true },
    });

    await logAudit({
      actor: ctx.actor,
      action: "UPDATE",
      entity: "Product",
      entityId: id,
      summary: `${field === "isActive" ? (value ? "نشر" : "إخفاء") : value ? "تمييز" : "إلغاء تمييز"} المنتج «${product.name}»`,
      changes: { [field]: { from: !value, to: value } },
      ip: ctx.ip,
    });
  } catch (error) {
    console.error("[admin] فشل تحديث المنتج:", error);
    return { ok: false, error: "تعذّر التحديث." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  return { ok: true };
}
