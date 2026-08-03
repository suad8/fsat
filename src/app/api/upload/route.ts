import { NextResponse } from "next/server";

import { MAX_FILES_PER_REQUEST } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { storeUpload, type StoredFile } from "@/lib/upload";

/**
 * رفع مرفقات العملاء (تصاميم وشعارات وصور توضيحية).
 *
 * مفتوح للزوار لأن رفع التصميم جزء من مسار الطلب قبل أي تسجيل دخول،
 * لذا محاط بحدّ معدّل صارم وبتحقق كامل من محتوى الملف في src/lib/upload.ts.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "upload"), {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: "تجاوزت عدد الملفات المسموح رفعها. حاول بعد قليل." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "تعذّرت قراءة الملفات المرسلة." },
      { status: 400 },
    );
  }

  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  const kind = form.get("kind") === "image" ? "image" : "design";

  if (files.length === 0) {
    return NextResponse.json({ ok: false, message: "لم يتم اختيار أي ملف." }, { status: 400 });
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { ok: false, message: `الحد الأقصى ${MAX_FILES_PER_REQUEST} ملفات في المرة الواحدة.` },
      { status: 400 },
    );
  }

  const stored: StoredFile[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const file of files) {
    const result = await storeUpload(file, kind, "customer");

    if ("error" in result) {
      errors.push({ name: file.name, error: result.error });
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
        console.error("[upload] تعذّر تسجيل الملف في مكتبة الصور:", error);
      }
    }
  }

  if (stored.length === 0) {
    return NextResponse.json(
      { ok: false, message: errors[0]?.error ?? "تعذّر رفع الملفات.", errors },
      { status: 422 },
    );
  }

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
