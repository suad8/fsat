"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { OPTION_PRICE_MODES, OPTION_TYPES, PRICE_MODES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/**
 * حفظ المنتج بخياراته وشرائح أسعاره وصوره.
 *
 * الصفوف المتفرّعة (الخيارات، الشرائح، الصور) تُحذف وتُعاد كتابتها بالكامل
 * داخل معاملة واحدة بدل مطابقتها صفًا بصف. هذا آمن هنا لأن بنود الطلبات
 * تحتفظ بلقطة من الخيارات المختارة وقت الطلب ولا ترتبط بمعرّفاتها، فحذف
 * قيمة خيار لا يؤثر على أي طلب سابق.
 */

const optionValueSchema = z.object({
  label: z.string().trim().min(1, "اسم الخيار مطلوب").max(120),
  value: z.string().trim().max(120).optional(),
  priceModifier: z.coerce.number().finite().default(0),
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
  values: z.array(optionValueSchema).default([]),
});

const tierSchema = z.object({
  minQty: z.coerce.number().int().positive("الحد الأدنى يجب أن يكون أكبر من صفر"),
  maxQty: z.coerce.number().int().positive().nullable().optional(),
  unitPrice: z.coerce.number().nonnegative(),
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
  basePrice: z.coerce.number().nonnegative().default(0),
  compareAtPrice: z.coerce.number().nonnegative().nullable().optional(),
  unit: z.string().trim().min(1).max(40).default("قطعة"),
  minQuantity: z.coerce.number().int().positive().default(1),
  quantityStep: z.coerce.number().int().positive().default(1),
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

export async function saveProductAction(payload: unknown): Promise<ProductActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." };
  }

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

  // الشرائح يجب ألا تتداخل، وإلا أصبح سعر الكمية الواحدة غامضًا
  const sortedTiers = [...data.quantityTiers].sort((a, b) => a.minQty - b.minQty);
  for (let index = 1; index < sortedTiers.length; index += 1) {
    const previous = sortedTiers[index - 1];
    const current = sortedTiers[index];
    if (previous.maxQty !== null && previous.maxQty !== undefined) {
      if (current.minQty <= previous.maxQty) {
        return {
          ok: false,
          error: `شرائح الكميات متداخلة: الشريحة التي تبدأ من ${current.minQty} تتقاطع مع التي قبلها.`,
        };
      }
    } else {
      return {
        ok: false,
        error: "الشريحة المفتوحة (بلا حد أعلى) يجب أن تكون الأخيرة.",
      };
    }
  }

  const base = {
    name: data.name,
    slug,
    shortDescription: data.shortDescription || null,
    description: data.description || null,
    categoryId: data.categoryId,
    priceMode: data.priceMode,
    basePrice: data.basePrice,
    compareAtPrice: data.compareAtPrice ?? null,
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
        unitPrice: tier.unitPrice,
        label: tier.label || null,
        order: index,
      })),
    },
    optionGroups: {
      create: data.optionGroups.map((group, groupIndex) => ({
        name: group.name,
        // المفتاح يُشتق من الاسم إن لم يُحدَّد، ويجب أن يكون فريدًا داخل المنتج
        key: group.key?.trim() || slugify(group.name) || `option-${groupIndex + 1}`,
        type: group.type,
        helpText: group.helpText || null,
        isRequired: group.isRequired,
        order: groupIndex,
        values: {
          create: group.values.map((value, valueIndex) => ({
            label: value.label,
            value: value.value?.trim() || value.label,
            priceModifier: value.priceModifier,
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
      await prisma.$transaction([
        // الحذف قبل إعادة الإنشاء — أبسط وأدق من مطابقة الصفوف واحدًا واحدًا
        prisma.productImage.deleteMany({ where: { productId } }),
        prisma.quantityTier.deleteMany({ where: { productId } }),
        prisma.optionGroup.deleteMany({ where: { productId } }),
        prisma.product.update({
          where: { id: productId },
          // set يستبدل قائمة الخدمات المرتبطة بالكامل
          data: { ...base, ...nested, services: { set: serviceLinks } },
        }),
      ]);
    } else {
      const created = await prisma.product.create({
        // connect عند الإنشاء — لا توجد روابط سابقة لاستبدالها
        data: { ...base, ...nested, services: { connect: serviceLinks } },
      });
      productId = created.id;
    }

    revalidatePath("/admin/products");
    revalidatePath("/", "layout");

    return { ok: true, id: productId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("Unique constraint") || message.includes("P2002")) {
      return {
        ok: false,
        error: /key/i.test(message)
          ? "يوجد مفتاحان متطابقان لمجموعتي خيارات. غيّر مفتاح إحداهما."
          : "رابط المنتج (slug) مستخدم لمنتج آخر.",
      };
    }

    console.error("[admin] فشل حفظ المنتج:", error);
    return { ok: false, error: "تعذّر حفظ المنتج. حاول مرة أخرى." };
  }
}

export async function deleteProductAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." };
  }

  try {
    // المنتج المرتبط بطلبات لا يُحذف — نخفيه بدل ذلك حتى يبقى سجل الطلبات سليمًا
    const orderItems = await prisma.orderItem.count({ where: { productId: id } });

    if (orderItems > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      revalidatePath("/admin/products");
      revalidatePath("/", "layout");
      return {
        ok: false,
        error:
          "هذا المنتج مرتبط بطلبات سابقة، فأُخفي من الموقع بدل حذفه حتى تبقى سجلات الطلبات صحيحة.",
      };
    }

    await prisma.product.delete({ where: { id } });
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
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." };
  }

  try {
    await prisma.product.update({ where: { id }, data: { [field]: value } });
  } catch (error) {
    console.error("[admin] فشل تحديث المنتج:", error);
    return { ok: false, error: "تعذّر التحديث." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  return { ok: true };
}
