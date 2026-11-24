/**
 * تقييد محاولات تسجيل الدخول — قفل مؤقت متصاعد.
 *
 * ثلاثة عدّادات للفشل، كلٌّ بحدّه:
 *   • IP + بريد  : يوقف التخمين المركّز على حساب من جهاز واحد.
 *   • IP فقط     : يوقف رشّ كلمات مرور على عدة بريدات من جهاز واحد.
 *   • بريد فقط   : يوقف التخمين الموزّع على عدة عناوين ضد حساب واحد.
 *
 * بعد تجاوز الحدّ يُقفل المفتاح مدة تتضاعف مع كل فشل إضافي (٣٠ث، ٦٠ث، ٢د … حتى
 * ١٥د). يُحسب الفشل للبريد سواء كان الحساب موجودًا أم لا، فلا يمكن استنتاج
 * وجود حساب من سلوك القفل.
 *
 * ⚠️ الحالة في ذاكرة العملية (انظر ملاحظة src/lib/rate-limit.ts). إعادة التشغيل
 *    تصفّر العدّادات — وهذا يكفي ضد التخمين العادي لكنه ليس مخزنًا دائمًا.
 */

type Counter = { failures: number; lockedUntil: number; lastFailureAt: number };

type Rule = { name: string; threshold: number };

const RULES = {
  ipEmail: { name: "ip-email", threshold: 5 },
  ip: { name: "ip", threshold: 20 },
  email: { name: "email", threshold: 12 },
} satisfies Record<string, Rule>;

const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 15 * 60_000;
/** يُنسى الفشل القديم بعد هذه المدة بلا نشاط. */
const FORGET_AFTER_MS = 30 * 60_000;
const MAX_KEYS = 20_000;

const counters = new Map<string, Counter>();

function keysFor(ip: string, email: string): { key: string; rule: Rule }[] {
  const normalized = email.trim().toLowerCase().slice(0, 160);
  return [
    { key: `${RULES.ipEmail.name}:${ip}|${normalized}`, rule: RULES.ipEmail },
    { key: `${RULES.ip.name}:${ip}`, rule: RULES.ip },
    { key: `${RULES.email.name}:${normalized}`, rule: RULES.email },
  ];
}

function sweep(now: number) {
  if (counters.size < MAX_KEYS) return;
  for (const [key, counter] of counters) {
    if (counter.lockedUntil <= now && now - counter.lastFailureAt > FORGET_AFTER_MS) {
      counters.delete(key);
    }
  }
  // لم يكفِ التنظيف: نُسقط الأقدم
  if (counters.size >= MAX_KEYS) {
    let excess = counters.size - MAX_KEYS + 1000;
    for (const key of counters.keys()) {
      counters.delete(key);
      excess -= 1;
      if (excess <= 0) break;
    }
  }
}

export type ThrottleVerdict = { allowed: true } | { allowed: false; retryAfter: number };

/** يُستدعى قبل أي عمل مكلف (bcrypt). */
export function checkLoginAllowed(ip: string, email: string): ThrottleVerdict {
  const now = Date.now();
  let wait = 0;

  for (const { key } of keysFor(ip, email)) {
    const counter = counters.get(key);
    if (counter && counter.lockedUntil > now) {
      wait = Math.max(wait, counter.lockedUntil - now);
    }
  }

  return wait > 0 ? { allowed: false, retryAfter: Math.ceil(wait / 1000) } : { allowed: true };
}

export function recordLoginFailure(ip: string, email: string): void {
  const now = Date.now();
  sweep(now);

  for (const { key, rule } of keysFor(ip, email)) {
    const existing = counters.get(key);
    const stale = existing && now - existing.lastFailureAt > FORGET_AFTER_MS;
    const counter: Counter =
      existing && !stale ? existing : { failures: 0, lockedUntil: 0, lastFailureAt: now };

    counter.failures += 1;
    counter.lastFailureAt = now;

    if (counter.failures >= rule.threshold) {
      const over = counter.failures - rule.threshold;
      const lock = Math.min(BASE_LOCK_MS * 2 ** over, MAX_LOCK_MS);
      counter.lockedUntil = now + lock;
    }

    counters.set(key, counter);
  }
}

/** نجاح الدخول يصفّر عدّاد (IP+بريد) فقط — عدّادا IP والبريد المنفردان يبقيان. */
export function recordLoginSuccess(ip: string, email: string): void {
  const [ipEmail] = keysFor(ip, email);
  counters.delete(ipEmail.key);
}

/** للاختبارات فقط. */
export function __resetLoginThrottle(): void {
  counters.clear();
}
