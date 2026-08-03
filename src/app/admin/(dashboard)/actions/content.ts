"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { PROJECT_IMAGE_STAGES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/** حفظ مشاريع معرض الأعمال والخدمات — كلاهما بصور وحقول متفرّعة. */

type Result = { ok: true; id: string } | { ok: false; error: string; issues?: string[] };

async function guard(): Promise<{ ok: false; error: string } | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." };
  }
}

// ---------------------------------------------------------------------------
// معرض الأعمال
// ---------------------------------------------------------------------------

const projectSchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(2, "عنوان المشروع مطلوب").max(160),
  slug: z.string().trim().max(160).optional(),
  categoryId: z.string().trim().min(1, "اختر تصنيف المشروع"),
  clientName: z.string().trim().max(120).optional().nullable(),
  summary: z.string().trim().max(400).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  materials: z.string().trim().max(400).optional().nullable(),
  dimensions: z.string().trim().max(200).optional().nullable(),
  techniques: z.string().trim().max(400).optional().nullable(),
  completedAt: z.string().trim().optional().nullable(),
  relatedProductId: z.string().trim().optional().nullable(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  order: z.coerce.number().int().default(0),
  seoTitle: z.string().trim().max(160).optional().nullable(),
  seoDescription: z.string().trim().max(400).optional().nullable(),
  images: z
    .array(
      z.object({
        url: z.string().trim().min(1),
        alt: z.string().trim().min(1, "النص البديل مطلوب لكل صورة").max(200),
        caption: z.string().trim().max(200).optional().nullable(),
        stage: z.enum(PROJECT_IMAGE_STAGES).default("RESULT"),
      }),
    )
    .max(24)
    .default([]),
});

export async function saveProjectAction(payload: unknown): Promise<Result> {
  const denied = await guard();
  if (denied) return denied;

  const parsed = projectSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      error: "تحقّق من الحقول المطلوبة.",
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const data = parsed.data;
  const slug = slugify(data.slug || data.title);
  if (!slug) return { ok: false, error: "تعذّر توليد رابط صالح من عنوان المشروع." };

  const base = {
    title: data.title,
    slug,
    categoryId: data.categoryId,
    clientName: data.clientName || null,
    summary: data.summary || null,
    description: data.description || null,
    materials: data.materials || null,
    dimensions: data.dimensions || null,
    techniques: data.techniques || null,
    completedAt: data.completedAt ? new Date(data.completedAt) : null,
    // السلسلة الفارغة تعني "بدون ربط" — لا يجوز تمريرها كمعرّف
    relatedProductId: data.relatedProductId || null,
    isFeatured: data.isFeatured,
    isActive: data.isActive,
    order: data.order,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
  };

  const images = {
    create: data.images.map((image, index) => ({
      url: image.url,
      alt: image.alt,
      caption: image.caption || null,
      stage: image.stage,
      order: index,
    })),
  };

  try {
    let projectId = data.id;

    if (projectId) {
      await prisma.$transaction([
        prisma.projectImage.deleteMany({ where: { projectId } }),
        prisma.project.update({ where: { id: projectId }, data: { ...base, images } }),
      ]);
    } else {
      const created = await prisma.project.create({ data: { ...base, images } });
      projectId = created.id;
    }

    revalidatePath("/admin/portfolio");
    revalidatePath("/", "layout");

    return { ok: true, id: projectId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Unique constraint") || message.includes("P2002")) {
      return { ok: false, error: "رابط المشروع (slug) مستخدم لمشروع آخر." };
    }

    console.error("[admin] فشل حفظ المشروع:", error);
    return { ok: false, error: "تعذّر حفظ المشروع." };
  }
}

export async function deleteProjectAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied.error };

  try {
    await prisma.project.delete({ where: { id } });
  } catch (error) {
    console.error("[admin] فشل حذف المشروع:", error);
    return { ok: false, error: "تعذّر حذف المشروع." };
  }

  revalidatePath("/admin/portfolio");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// الخدمات
// ---------------------------------------------------------------------------

const serviceSchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(2, "عنوان الخدمة مطلوب").max(160),
  slug: z.string().trim().max(160).optional(),
  shortDescription: z.string().trim().min(10, "الوصف المختصر مطلوب").max(400),
  description: z.string().trim().max(6000).optional().nullable(),
  iconKey: z.string().trim().max(40).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  imageAlt: z.string().trim().max(200).optional().nullable(),
  highlights: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(true),
  order: z.coerce.number().int().default(0),
  seoTitle: z.string().trim().max(160).optional().nullable(),
  seoDescription: z.string().trim().max(400).optional().nullable(),
  productIds: z.array(z.string()).default([]),
  images: z
    .array(
      z.object({
        url: z.string().trim().min(1),
        alt: z.string().trim().min(1, "النص البديل مطلوب لكل صورة").max(200),
      }),
    )
    .max(12)
    .default([]),
});

export async function saveServiceAction(payload: unknown): Promise<Result> {
  const denied = await guard();
  if (denied) return denied;

  const parsed = serviceSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      error: "تحقّق من الحقول المطلوبة.",
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const data = parsed.data;
  const slug = slugify(data.slug || data.title);
  if (!slug) return { ok: false, error: "تعذّر توليد رابط صالح من عنوان الخدمة." };

  const base = {
    title: data.title,
    slug,
    shortDescription: data.shortDescription,
    description: data.description || null,
    iconKey: data.iconKey || null,
    imageUrl: data.imageUrl || null,
    imageAlt: data.imageAlt || null,
    highlights: data.highlights,
    isActive: data.isActive,
    isFeatured: data.isFeatured,
    order: data.order,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
  };

  const images = {
    create: data.images.map((image, index) => ({
      url: image.url,
      alt: image.alt,
      order: index,
    })),
  };

  const productLinks = data.productIds.map((id) => ({ id }));

  try {
    let serviceId = data.id;

    if (serviceId) {
      await prisma.$transaction([
        prisma.serviceImage.deleteMany({ where: { serviceId } }),
        prisma.service.update({
          where: { id: serviceId },
          data: { ...base, images, products: { set: productLinks } },
        }),
      ]);
    } else {
      const created = await prisma.service.create({
        data: { ...base, images, products: { connect: productLinks } },
      });
      serviceId = created.id;
    }

    revalidatePath("/admin/services");
    revalidatePath("/", "layout");

    return { ok: true, id: serviceId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Unique constraint") || message.includes("P2002")) {
      return { ok: false, error: "رابط الخدمة (slug) مستخدم لخدمة أخرى." };
    }

    console.error("[admin] فشل حفظ الخدمة:", error);
    return { ok: false, error: "تعذّر حفظ الخدمة." };
  }
}

export async function deleteServiceAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied.error };

  try {
    await prisma.service.delete({ where: { id } });
  } catch (error) {
    console.error("[admin] فشل حذف الخدمة:", error);
    return { ok: false, error: "تعذّر حذف الخدمة." };
  }

  revalidatePath("/admin/services");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** تبديل حقل منطقي للمشاريع والخدمات من الجدول مباشرة. */
export async function toggleContentFieldAction(
  model: "project" | "service",
  id: string,
  field: "isActive" | "isFeatured",
  value: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied.error };

  try {
    if (model === "project") {
      await prisma.project.update({ where: { id }, data: { [field]: value } });
    } else {
      await prisma.service.update({ where: { id }, data: { [field]: value } });
    }
  } catch (error) {
    console.error("[admin] فشل التحديث:", error);
    return { ok: false, error: "تعذّر التحديث." };
  }

  revalidatePath(model === "project" ? "/admin/portfolio" : "/admin/services");
  revalidatePath("/", "layout");
  return { ok: true };
}
