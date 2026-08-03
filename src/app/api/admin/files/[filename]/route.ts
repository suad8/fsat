import { readFile, stat } from "node:fs/promises";

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { resolvePrivateFile } from "@/lib/upload";

/**
 * تنزيل ملفات التصاميم التي يرفعها العملاء.
 *
 * هذه الملفات (PDF/AI/PSD/ZIP) لا يمكن إعادة ترميزها للتأكد من سلامتها، لذا
 * تُحفظ خارج مجلد public ولا تُخدَم إلا من هنا بعد التحقق من جلسة الإدارة.
 * كما تُرسل بترويسات تُجبر المتصفّح على تنزيلها بدل عرضها، فلا تُنفَّذ في سياق
 * نطاق الموقع.
 */
export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  eps: "application/postscript",
  ai: "application/postscript",
  psd: "image/vnd.adobe.photoshop",
  zip: "application/zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ message: "غير مصرّح." }, { status: 401 });
  }

  const { filename } = await params;

  // يتحقق من صيغة الاسم ومن بقاء المسار داخل مجلد الملفات الخاصة
  const path = resolvePrivateFile(filename);
  if (!path) {
    return NextResponse.json({ message: "ملف غير صالح." }, { status: 400 });
  }

  try {
    const info = await stat(path);
    if (!info.isFile()) throw new Error("not a file");

    const data = await readFile(path);
    const extension = filename.split(".").pop()?.toLowerCase() ?? "";

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        // attachment يمنع عرض الملف داخل الصفحة
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(info.size),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ message: "الملف غير موجود." }, { status: 404 });
  }
}
