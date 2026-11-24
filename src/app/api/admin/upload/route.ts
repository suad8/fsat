import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { MAX_FILES_PER_REQUEST } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { apiError, guardMultipartPost, internalError } from "@/lib/security/api";
import { clientIp } from "@/lib/security/ip";
import { logSecurityEvent } from "@/lib/security/log";
import { storeUpload, type StoredFile } from "@/lib/upload";

/**
 * رفع الصور من لوحة التحكم إلى مكتبة الصور.
 *
 * محمي بجلسة الإدارة (تحقق عميق من القاعدة) وبفحص الأصل، ويقبل الصور فقط —
 * تُعاد ترميزها عبر sharp قبل الحفظ (انظر src/lib/upload.ts) فلا يمكن حفظ
 * ملف قابل للتنفيذ أو SVG يحمل سكربتًا.
 */
export const runtime = "nodejs";

const MAX_BODY_BYTES = 45 * 1024 * 1024;

const FOLDERS = ["products", "projects", "services", "equipment", "brand", "uploads"];

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    logSecurityEvent("unauthorized", { where: "api/admin/upload", ip: clientIp(request.headers) });
    return apiError(401, "غير مصرّح. أعد تسجيل الدخول.");
  }

  const guard = await guardMultipartPost(request, {
    scope: "admin-upload",
    limit: 60,
    windowMs: 10 * 60 * 1000,
    maxBytes: MAX_BODY_BYTES,
    rateLimitMessage: "عدد كبير من عمليات الرفع. انتظر قليلًا.",
  });
  if (!guard.ok) return guard.response;

  const form = guard.form;

  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  const folderRaw = form.get("folder");
  // مجلد من قائمة مغلقة — لا يأتي مسار حرّ من العميل
  const folder = typeof folderRaw === "string" && FOLDERS.includes(folderRaw) ? folderRaw : "uploads";

  if (files.length === 0) {
    return apiError(400, "لم يتم اختيار أي ملف.");
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return apiError(400, `الحد الأقصى ${MAX_FILES_PER_REQUEST} ملفات في المرة الواحدة.`);
  }

  const stored: StoredFile[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const file of files) {
    let result;
    try {
      result = await storeUpload(file, "image", folder);
    } catch (error) {
      return internalError("admin/upload", error, "تعذّر رفع الصور. حاول مرة أخرى.");
    }

    if ("error" in result) {
      logSecurityEvent("upload_rejected", {
        scope: "admin",
        code: result.code,
        size: file.size,
        userId: admin.id,
      });
      errors.push({ name: file.name.slice(0, 120), error: result.error });
      continue;
    }

    stored.push(result);

    try {
      await prisma.mediaAsset.create({
        data: {
          url: result.url,
          filename: result.filename,
          originalName: result.originalName,
          mimeType: result.mimeType,
          size: result.size,
          width: result.width,
          height: result.height,
          folder,
        },
      });
    } catch (error) {
      console.error(
        "[admin/upload] تعذّر تسجيل الصورة في المكتبة:",
        error instanceof Error ? error.message : "",
      );
    }
  }

  if (stored.length === 0) {
    return NextResponse.json(
      { ok: false, message: errors[0]?.error ?? "تعذّر رفع الصور.", errors },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    files: stored.map((file) => ({
      url: file.url,
      name: file.originalName,
      width: file.width,
      height: file.height,
      size: file.size,
    })),
    errors,
  });
}
