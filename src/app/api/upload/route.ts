import { NextResponse } from "next/server";

import { MAX_FILES_PER_REQUEST } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { apiError, guardMultipartPost, internalError } from "@/lib/security/api";
import { clientIp } from "@/lib/security/ip";
import { logSecurityEvent } from "@/lib/security/log";
import { storeUpload, type StoredFile } from "@/lib/upload";

/**
 * رفع مرفقات العملاء (تصاميم وشعارات وصور توضيحية).
 *
 * مفتوح للزوار لأن رفع التصميم جزء من مسار الطلب قبل أي تسجيل دخول،
 * لذا محاط بطبقات: فحص أصل، حدّ معدّل **يُحسب بعدد الملفات**، سقف لحجم الجسم
 * يُفرض أثناء القراءة، وتحقق كامل من محتوى كل ملف في src/lib/upload.ts.
 */
export const runtime = "nodejs";

/** سقف الجسم الكلي: ملفان كبيران أو عدة ملفات صغيرة — لا خمسة بحجم ٢٥ ميجابايت. */
const MAX_BODY_BYTES = 60 * 1024 * 1024;

export async function POST(request: Request) {
  const guard = await guardMultipartPost(request, {
    scope: "upload",
    // حدّ على عدد *الطلبات*؛ وحدّ منفصل على عدد *الملفات* يُحسب بعد قراءة الجسم
    limit: 12,
    windowMs: 10 * 60 * 1000,
    maxBytes: MAX_BODY_BYTES,
    rateLimitMessage: "تجاوزت عدد الملفات المسموح رفعها. حاول بعد قليل.",
  });
  if (!guard.ok) return guard.response;

  const form = guard.form;
  const ip = clientIp(request.headers);

  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  const kind = form.get("kind") === "image" ? "image" : "design";

  if (files.length === 0) {
    return apiError(400, "لم يتم اختيار أي ملف.");
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return apiError(400, `الحد الأقصى ${MAX_FILES_PER_REQUEST} ملفات في المرة الواحدة.`);
  }

  // ٢٠ ملفًا كل ١٠ دقائق للعنوان الواحد (الحدّ السابق كان ٢٠ طلبًا × ٥ ملفات = ١٠٠ ملف)
  const filesLimit = rateLimit(
    clientKey(request, "upload-files"),
    { limit: 20, windowMs: 10 * 60 * 1000 },
    files.length,
  );
  if (!filesLimit.allowed) {
    logSecurityEvent("rate_limited", { scope: "upload-files", ip });
    return apiError(
      429,
      "تجاوزت عدد الملفات المسموح رفعها. حاول بعد قليل.",
      {},
      { "Retry-After": String(filesLimit.retryAfter) },
    );
  }

  const stored: StoredFile[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const file of files) {
    let result;
    try {
      result = await storeUpload(file, kind, "customer");
    } catch (error) {
      return internalError("upload", error, "تعذّر رفع الملفات. حاول مرة أخرى.");
    }

    if ("error" in result) {
      logSecurityEvent("upload_rejected", {
        scope: "public",
        code: result.code,
        size: file.size,
        ip,
      });
      errors.push({ name: file.name.slice(0, 120), error: result.error });
      continue;
    }

    stored.push(result);

    // الصور العامة تُسجَّل في مكتبة الصور لتظهر في لوحة التحكم
    if (!result.isPrivate) {
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
            folder: "customer",
          },
        });
      } catch (error) {
        // فشل التسجيل في المكتبة لا يمنع نجاح الرفع نفسه
        console.error("[upload] تعذّر تسجيل الملف في مكتبة الصور:", error instanceof Error ? error.message : "");
      }
    }
  }

  if (stored.length === 0) {
    return NextResponse.json(
      { ok: false, message: errors[0]?.error ?? "تعذّر رفع الملفات.", errors },
      { status: 422 },
    );
  }

  logSecurityEvent("upload_stored", { scope: "public", count: stored.length, ip }, "info");

  return NextResponse.json({
    ok: true,
    files: stored.map((file) => ({
      name: file.originalName,
      url: file.url,
      size: file.size,
      mimeType: file.mimeType,
    })),
    errors,
  });
}
