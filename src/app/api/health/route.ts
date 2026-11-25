import { prisma } from "@/lib/prisma";

/**
 * فحص صحة للنشر (Railway healthcheck) ولأي مراقب خارجي.
 *
 * خفيف عمدًا: استعلام `SELECT 1` واحد فقط — يثبت أن العملية تستجيب وأن ملف
 * SQLite مفتوح وقابل للقراءة، دون مسّ جداول المحتوى ولا تحميل صفحات.
 * لا يكشف أي تفاصيل داخلية (لا أسماء ملفات ولا رسائل أخطاء) لأن المسار عام.
 */

// لا يُخزَّن ولا يُبنى مسبقًا: كل استدعاء يفحص القاعدة فعلًا
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok", db: "up", ms: Date.now() - startedAt },
      { headers: NO_STORE },
    );
  } catch (error) {
    // نسجّل السبب في سجلات الخادم فقط
    console.error("[health] فشل فحص القاعدة:", error);
    return Response.json(
      { status: "error", db: "down" },
      { status: 503, headers: NO_STORE },
    );
  }
}

// بعض المراقبات ترسل HEAD
export async function HEAD() {
  const res = await GET();
  return new Response(null, { status: res.status, headers: res.headers });
}
