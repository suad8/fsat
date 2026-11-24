import { clientIp } from "@/lib/security/ip";

/**
 * محدّد معدّل الطلبات — عدّاد بنافذة ثابتة في الذاكرة.
 *
 * يحمي نماذج التواصل وعروض الأسعار ومسار الرفع من الإرسال الآلي المتكرر.
 *
 * ⚠️ الحالة محفوظة في ذاكرة العملية الواحدة. هذا كافٍ للنشر على خادم واحد
 *    (VPS أو حاوية — وهو ما يفرضه SQLite أصلًا). عند التوسّع لعدة نسخ أو النشر
 *    على بيئة بلا حالة، استبدل الخريطة أدناه بـ Redis — الواجهة نفسها لا تتغيّر.
 */

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

/** سقف لعدد المفاتيح: مهاجم يدوّر عناوين IP لا يستطيع تضخيم الذاكرة بلا حدّ. */
const MAX_KEYS = 50_000;

/** تنظيف دوري يمنع تضخّم الخريطة بمفاتيح منتهية. */
let lastSweep = Date.now();
const SWEEP_INTERVAL = 60 * 1000;

function sweep(now: number) {
  const overflow = buckets.size > MAX_KEYS;
  if (!overflow && now - lastSweep < SWEEP_INTERVAL) return;
  lastSweep = now;

  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }

  // ما زالت الخريطة ممتلئة بمفاتيح حيّة: نُسقط الأقدم (ترتيب الإدراج)
  if (buckets.size > MAX_KEYS) {
    let excess = buckets.size - MAX_KEYS;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      excess -= 1;
      if (excess <= 0) break;
    }
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** ثوانٍ متبقية حتى إعادة الضبط — تُرسل في ترويسة Retry-After. */
  retryAfter: number;
};

/**
 * @param cost عدد الوحدات التي يستهلكها هذا الطلب (مثلاً عدد الملفات المرفوعة).
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  cost = 1,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: cost, resetAt: now + windowMs });
    if (cost > limit) {
      return { allowed: false, remaining: 0, retryAfter: Math.ceil(windowMs / 1000) };
    }
    return { allowed: true, remaining: limit - cost, retryAfter: 0 };
  }

  entry.count += cost;

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
 * مفتاح التحديد: النطاق + عنوان العميل.
 *
 * العنوان يُستخرج بحذر من x-forwarded-for (انظر src/lib/security/ip.ts) —
 * ما يضيفه الوكيل الموثوق في آخر القائمة لا ما يكتبه العميل في أولها.
 */
export function clientKey(request: Request, scope: string): string {
  return `${scope}:${clientIp(request.headers)}`;
}
