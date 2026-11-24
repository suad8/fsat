"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";

import { getAdminContext } from "@/lib/data/admin-context";
import { logAudit } from "@/lib/data/audit";
import { prisma } from "@/lib/prisma";

/** حذف صورة من المكتبة ومن القرص. */
export async function deleteMediaAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await getAdminContext();
  } catch {
    return { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." };
  }

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return { ok: false, error: "الصورة غير موجودة." };

  // نتحقق أن الصورة غير مستخدمة قبل الحذف — حذفها يترك مربّعًا مكسورًا في الموقع
  const [productImages, projectImages, serviceImages, categories, equipment, services] =
    await Promise.all([
      prisma.productImage.count({ where: { url: asset.url } }),
      prisma.projectImage.count({ where: { url: asset.url } }),
      prisma.serviceImage.count({ where: { url: asset.url } }),
      prisma.category.count({ where: { imageUrl: asset.url } }),
      prisma.equipment.count({ where: { imageUrl: asset.url } }),
      prisma.service.count({ where: { imageUrl: asset.url } }),
    ]);

  const usage =
    productImages + projectImages + serviceImages + categories + equipment + services;

  if (usage > 0) {
    return {
      ok: false,
      error: `هذه الصورة مستخدمة في ${usage} موضع. أزلها من هناك أولاً ثم احذفها.`,
    };
  }

  try {
    // المسار مبني من url المخزّن الذي أنشأناه نحن، لا من إدخال مستخدم
    if (asset.url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", asset.url);
      const publicRoot = path.resolve(process.cwd(), "public", "uploads");

      if (path.resolve(filePath).startsWith(publicRoot + path.sep)) {
        await unlink(filePath).catch(() => {
          // الملف محذوف مسبقًا — لا يمنع حذف السجل
        });
      }
    }

    await prisma.mediaAsset.delete({ where: { id } });

    await logAudit({
      actor: ctx.actor,
      action: "DELETE",
      entity: "MediaAsset",
      entityId: id,
      summary: `حذف ملف من المكتبة (${asset.originalName})`,
      changes: { url: asset.url, size: asset.size },
      ip: ctx.ip,
    });
  } catch (error) {
    console.error("[admin] فشل حذف الصورة:", error);
    return { ok: false, error: "تعذّر حذف الصورة." };
  }

  revalidatePath("/admin/media");
  return { ok: true };
}

/** تحديث النص البديل لصورة في المكتبة. */
export async function updateMediaAltAction(
  id: string,
  alt: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await getAdminContext();
  } catch {
    return { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." };
  }

  try {
    await prisma.mediaAsset.update({
      where: { id },
      data: { alt: alt.trim().slice(0, 200) || null },
    });
  } catch (error) {
    console.error("[admin] فشل تحديث النص البديل:", error);
    return { ok: false, error: "تعذّر التحديث." };
  }

  revalidatePath("/admin/media");
  return { ok: true };
}
