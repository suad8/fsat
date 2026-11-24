import { readFile } from "node:fs/promises";

import { resolvePublicUpload } from "@/lib/upload";

/**
 * تقديم الصور المرفوعة (العامة) أثناء التشغيل.
 *
 * `next start` لا يخدم ملفات أُضيفت إلى public/ بعد البناء (يقرأ قائمة الملفات مرة
 * واحدة عند الإقلاع) — فالصور التي يرفعها المدير والعملاء كانت تعطي 404 في
 * الإنتاج. next.config.ts يعيد توجيه /uploads/:folder/:filename إلى هذا المسار.
 *
 * الأمان: المجلد من قائمة بيضاء، والاسم يطابق نمط ما نولّده حصرًا (webp)، والمسار
 * النهائي يُتحقق أنه داخل public/uploads. لا شيء يُقرأ خارج ذلك.
 */
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folder: string; filename: string }> },
) {
  const { folder, filename } = await params;

  const filePath = resolvePublicUpload(folder, filename);
  if (!filePath) return new Response("Not found", { status: 404 });

  try {
    const data = await readFile(filePath);

    return new Response(new Uint8Array(data), {
      headers: {
        // دائمًا webp: كل ما نخزّنه أعدنا ترميزه بأنفسنا
        "Content-Type": "image/webp",
        "Content-Length": String(data.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        // الأسماء عشوائية وفريدة لكل ملف، فلا خطر في التخزين الطويل
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
