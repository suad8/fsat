import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { MAX_FILES_PER_REQUEST } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { storeUpload, type StoredFile } from "@/lib/upload";

/**
 * رفع الصور من لوحة التحكم إلى مكتبة الصور.
 *
 * محمي بجلسة الإدارة، ويقبل الصور فقط — تُعاد ترميزها عبر sharp قبل الحفظ
 * (انظر src/lib/upload.ts) فلا يمكن حفظ ملف قابل للتنفيذ أو SVG يحمل سكربتًا.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json(
      { ok: false, message: "غير مصرّح. أعد تسجيل الدخول." },
      { status: 401 },
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
  const folderRaw = form.get("folder");
  // مجلد من قائمة مغلقة — لا يأتي مسار حرّ من العميل
  const folder =
    typeof folderRaw === "string" &&
    ["products", "projects", "services", "equipment", "brand", "uploads"].includes(folderRaw)
      ? folderRaw
      : "uploads";

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
    const result = await storeUpload(file, "image", folder);

    if ("error" in result) {
      errors.push({ name: file.name, error: result.error });
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
      console.error("[admin/upload] تعذّر تسجيل الصورة في المكتبة:", error);
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
