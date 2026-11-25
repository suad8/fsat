"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PROJECT_IMAGE_STAGES } from "@/lib/constants";
import { getAdminContext, type AdminContext } from "@/lib/data/admin-context";
import { diffRecords, logAudit, writeAudit } from "@/lib/data/audit";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/** حفظ مشاريع معرض الأعمال والخدمات — كلاهما بصور وحقول متفرّعة. */

type Result = { ok: true; id: string } | { ok: false; error: string; issues?: string[] };

async function guard(): Promise<{ ctx: AdminContext } | { denied: { ok: false; error: string } }> {
  try {
    return { ctx: await getAdminContext() };
  } catch {
    return { denied: { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." } };
  }
}

const PROJECT_AUDIT_FIELDS = [
  "title",
  "slug",
  "categoryId",
  "clientName",
  "summary",
  "description",
  "materials",
  "dimensions",
  "techniques",
  "completedAt",
  "relatedProductId",
  "isFeatured",
  "isActive",
  "order",
  "seoTitle",
  "seoDescription",
] as const;

const SERVICE_AUDIT_FIELDS = [
  "title",
  "slug",
  "shortDescription",
  "description",
  "iconKey",
  "imageUrl",
  "imageAlt",
  "isActive",
  "isFeatured",
  "order",
  "seoTitle",
  "seoDescription",
] as const;

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
  const auth = await guard();
  if ("denied" in auth) return auth.denied;
  const { ctx } = auth;

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
      const id = projectId;
      const before = await prisma.project.findUnique({ where: { id } });
      if (!before) return { ok: false, error: "المشروع غير موجود." };

      await prisma.$transaction(async (tx) => {
        await tx.projectImage.deleteMany({ where: { projectId: id } });
        await tx.project.update({ where: { id }, data: { ...base, images } });
        await writeAudit(
          {
            actor: ctx.actor,
            action: "UPDATE",
            entity: "Project",
            entityId: id,
            summary: `تعديل المشروع «${data.title}»`,
            changes: diffRecords(before, base, { fields: PROJECT_AUDIT_FIELDS }),
            ip: ctx.ip,
          },
          tx,
        );
      });
    } else {
      const created = await prisma.$transaction(async (tx) => {
        const record = await tx.project.create({ data: { ...base, images } });
        await writeAudit(
          {
            actor: ctx.actor,
            action: "CREATE",
            entity: "Project",
            entityId: record.id,
            summary: `إضافة مشروع «${data.title}» إلى معرض الأعمال`,
            changes: { slug, categoryId: base.categoryId, images: data.images.length },
            ip: ctx.ip,
          },
          tx,
        );
        return record;
      });
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
  const auth = await guard();
  if ("denied" in auth) return { ok: false, error: auth.denied.error };
  const { ctx } = auth;

  try {
    await prisma.$transaction(async (tx) => {
      const project = await tx.project.delete({ where: { id } });
      await writeAudit(
        {
          actor: ctx.actor,
          action: "DELETE",
          entity: "Project",
          entityId: id,
          summary: `حذف المشروع «${project.title}»`,
          changes: { title: project.title, slug: project.slug },
          ip: ctx.ip,
        },
        tx,
      );
    });
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
  const auth = await guard();
  if ("denied" in auth) return auth.denied;
  const { ctx } = auth;

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
      const id = serviceId;
      const before = await prisma.service.findUnique({ where: { id } });
      if (!before) return { ok: false, error: "الخدمة غير موجودة." };

      await prisma.$transaction(async (tx) => {
        await tx.serviceImage.deleteMany({ where: { serviceId: id } });
        await tx.service.update({
          where: { id },
          data: { ...base, images, products: { set: productLinks } },
        });
        await writeAudit(
          {
            actor: ctx.actor,
            action: "UPDATE",
            entity: "Service",
            entityId: id,
            summary: `تعديل الخدمة «${data.title}»`,
            changes: diffRecords(before, base, { fields: SERVICE_AUDIT_FIELDS }),
            ip: ctx.ip,
          },
          tx,
        );
      });
    } else {
      const created = await prisma.$transaction(async (tx) => {
        const record = await tx.service.create({
          data: { ...base, images, products: { connect: productLinks } },
        });
        await writeAudit(
          {
            actor: ctx.actor,
            action: "CREATE",
            entity: "Service",
            entityId: record.id,
            summary: `إضافة الخدمة «${data.title}»`,
            changes: { slug, products: data.productIds.length },
            ip: ctx.ip,
          },
          tx,
        );
        return record;
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
  const auth = await guard();
  if ("denied" in auth) return { ok: false, error: auth.denied.error };
  const { ctx } = auth;

  try {
    await prisma.$transaction(async (tx) => {
      const service = await tx.service.delete({ where: { id } });
      await writeAudit(
        {
          actor: ctx.actor,
          action: "DELETE",
          entity: "Service",
          entityId: id,
          summary: `حذف الخدمة «${service.title}»`,
          changes: { title: service.title, slug: service.slug },
          ip: ctx.ip,
        },
        tx,
      );
    });
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
  const auth = await guard();
  if ("denied" in auth) return { ok: false, error: auth.denied.error };
  const { ctx } = auth;

  // القيم تأتي من العميل: قوائم مغلقة قبل استعمالها اسم نموذج/عمود
  if ((model !== "project" && model !== "service") || (field !== "isActive" && field !== "isFeatured")) {
    return { ok: false, error: "طلب غير صالح." };
  }

  try {
    const record =
      model === "project"
        ? await prisma.project.update({ where: { id }, data: { [field]: Boolean(value) }, select: { title: true } })
        : await prisma.service.update({ where: { id }, data: { [field]: Boolean(value) }, select: { title: true } });

    await logAudit({
      actor: ctx.actor,
      action: "UPDATE",
      entity: model === "project" ? "Project" : "Service",
      entityId: id,
      summary: `${field === "isActive" ? (value ? "نشر" : "إخفاء") : value ? "تمييز" : "إلغاء تمييز"} «${record.title}»`,
      changes: { [field]: { from: !value, to: value } },
      ip: ctx.ip,
    });
  } catch (error) {
    console.error("[admin] فشل التحديث:", error);
    return { ok: false, error: "تعذّر التحديث." };
  }

  revalidatePath(model === "project" ? "/admin/portfolio" : "/admin/services");
  revalidatePath("/", "layout");
  return { ok: true };
}
