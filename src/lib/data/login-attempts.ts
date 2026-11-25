import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  محاولات تسجيل الدخول — مقترح لمحور الحماية
 * ============================================================================
 *  الحدّ الحالي من المحاولات يعيش في ذاكرة العملية (src/lib/rate-limit.ts):
 *  يُصفَّر عند كل إعادة تشغيل ولا يتشاركه أكثر من نسخة. هذا الجدول يجعله دائمًا:
 *
 *    في authenticate() / loginAction:
 *      const lock = await getLoginLock({ email, ip });
 *      if (lock.locked) return { ok: false, error: `حاول بعد ${lock.retryAfterSeconds} ثانية` };
 *      …بعد التحقق…
 *      await recordLoginAttempt({ email, ip, success, reason });
 *
 *  القفل مزدوج: بالبريد (يحمي الحساب من التخمين من عناوين متعددة) وبالعنوان
 *  (يحمي من تجريب حسابات كثيرة من مصدر واحد). نجاح الدخول يُنهي عدّ الفشل
 *  السابق لأن العدّ يبدأ من آخر نجاح.
 *
 *  لا يُكتب هنا أي كلمة مرور، ولا يُخزَّن إلا البريد المُدخل والعنوان.
 * ============================================================================
 */

export type LoginAttemptInput = {
  email: string;
  ip?: string | null;
  success: boolean;
  reason?: "BAD_CREDENTIALS" | "LOCKED" | "INACTIVE" | string;
};

export const LOGIN_LOCK_POLICY = {
  /** عدد الفشل المسموح خلال النافذة قبل القفل. */
  maxFailures: 5,
  windowMs: 15 * 60 * 1000,
  /** حدّ أوسع للعنوان الواحد (قد يشترك عدة موظفين في شبكة). */
  maxFailuresPerIp: 20,
} as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 160);
}

export async function recordLoginAttempt(input: LoginAttemptInput): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        email: normalizeEmail(input.email),
        ip: input.ip ?? null,
        success: input.success,
        reason: input.reason ?? null,
      },
    });
  } catch (error) {
    // تعطّل السجلّ لا يجب أن يمنع الدخول الشرعي
    console.error("[login-attempts] تعذّر التسجيل:", error);
  }
}

export type LoginLock =
  | { locked: false }
  | { locked: true; retryAfterSeconds: number; scope: "email" | "ip" };

/** فشل متتالٍ منذ آخر نجاح داخل النافذة، مع وقت أقدم فشل لحساب مدّة الانتظار. */
async function recentFailures(where: { email?: string; ip?: string }, since: Date) {
  const lastSuccess = await prisma.loginAttempt.findFirst({
    where: { ...where, success: true, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const failures = await prisma.loginAttempt.findMany({
    where: {
      ...where,
      success: false,
      createdAt: { gte: lastSuccess?.createdAt ?? since },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  return failures;
}

export async function getLoginLock(
  subject: { email: string; ip?: string | null },
  now: Date = new Date(),
): Promise<LoginLock> {
  const since = new Date(now.getTime() - LOGIN_LOCK_POLICY.windowMs);

  const byEmail = await recentFailures({ email: normalizeEmail(subject.email) }, since);
  if (byEmail.length >= LOGIN_LOCK_POLICY.maxFailures) {
    const unlockAt = byEmail[0].createdAt.getTime() + LOGIN_LOCK_POLICY.windowMs;
    return {
      locked: true,
      scope: "email",
      retryAfterSeconds: Math.max(1, Math.ceil((unlockAt - now.getTime()) / 1000)),
    };
  }

  if (subject.ip) {
    const byIp = await recentFailures({ ip: subject.ip }, since);
    if (byIp.length >= LOGIN_LOCK_POLICY.maxFailuresPerIp) {
      const unlockAt = byIp[0].createdAt.getTime() + LOGIN_LOCK_POLICY.windowMs;
      return {
        locked: true,
        scope: "ip",
        retryAfterSeconds: Math.max(1, Math.ceil((unlockAt - now.getTime()) / 1000)),
      };
    }
  }

  return { locked: false };
}

/** حذف السجلات الأقدم من عدد أيام معيّن (يستدعيه scripts/cleanup.ts). */
export async function pruneLoginAttempts(olderThanDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return result.count;
}
