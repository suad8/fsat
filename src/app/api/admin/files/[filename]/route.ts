import { readFile, stat } from "node:fs/promises";

import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/security/api";
import { clientIp } from "@/lib/security/ip";
import { logSecurityEvent } from "@/lib/security/log";
import { resolvePrivateFile } from "@/lib/upload";

/**
 * تنزيل ملفات التصاميم التي يرفعها العملاء.
 *
 * هذه الملفات (PDF/AI/PSD/ZIP) لا يمكن إعادة ترميزها للتأكد من سلامتها، لذا
 * تُحفظ خارج مجلد public ولا تُخدَم إلا من هنا بعد التحقق العميق من جلسة الإدارة.
 * وتُرسل بترويسات تُجبر المتصفّح على تنزيلها بدل عرضها فلا تُنفَّذ في سياق
 * نطاق الموقع، مع CSP بصندوق رمل احتياطًا لو فُتحت رغم ذلك.
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
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    logSecurityEvent("unauthorized", { where: "api/admin/files", ip: clientIp(request.headers) });
    return apiError(401, "غير مصرّح.", {}, { "Cache-Control": "no-store" });
  }

  const { filename } = await params;

  // يتحقق من صيغة الاسم ومن بقاء المسار داخل مجلد الملفات الخاصة
  const path = resolvePrivateFile(filename);
  if (!path) {
    return apiError(400, "ملف غير صالح.");
  }

  try {
    const info = await stat(path);
    if (!info.isFile()) throw new Error("not a file");

    const data = await readFile(path);
    const extension = filename.split(".").pop()?.toLowerCase() ?? "";

    logSecurityEvent("private_file_read", { userId: admin.id, file: filename }, "info");

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        // attachment يمنع عرض الملف داخل الصفحة؛ الاسم مطابق لنمط مولَّد فلا حقن ترويسات
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(info.size),
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return apiError(404, "الملف غير موجود.");
  }
}
