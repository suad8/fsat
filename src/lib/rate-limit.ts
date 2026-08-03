/**
 * محدّد معدّل الطلبات — نافذة منزلقة في الذاكرة.
 *
 * يحمي نماذج التواصل وعروض الأسعار ومسار الرفع من الإرسال الآلي المتكرر.
 *
 * ⚠️ الحالة محفوظة في ذاكرة العملية الواحدة. هذا كافٍ للنشر على خادم واحد
 *    (VPS أو حاوية). عند التوسّع لعدة نسخ أو النشر على بيئة بلا حالة،
 *    استبدل الخريطة أدناه بـ Redis — الواجهة نفسها لا تتغيّر.
 */

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

/** تنظيف دوري يمنع تضخّم الخريطة بمفاتيح منتهية. */
let lastSweep = Date.now();
const SWEEP_INTERVAL = 5 * 60 * 1000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL) return;
  lastSweep = now;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** ثوانٍ متبقية حتى إعادة الضبط — تُرسل في ترويسة Retry-After. */
  retryAfter: number;
};

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { allowed: true, remaining: limit - entry.count, retryAfter: 0 };
}

/**
 * استخراج عنوان العميل من ترويسات الوكيل العكسي.
 *
 * ⚠️ هذه الترويسات قابلة للانتحال إن لم يكن أمام التطبيق وكيل عكسي موثوق
 *    يعيد كتابتها. اضبط الوكيل ليضع x-forwarded-for بنفسه قبل الاعتماد
 *    على هذا التحديد في بيئة الإنتاج.
 */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");

  const ip = forwarded?.split(",")[0]?.trim() || real?.trim() || "unknown";

  return `${scope}:${ip}`;
}
