import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";

import type { AdminRole } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent, maskEmail } from "@/lib/security/log";
import { isKnownDefaultPassword } from "@/lib/security/password";
import { securityStamp, verifySessionToken } from "@/lib/security/session";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/security/session-token";

/**
 * ============================================================================
 *  مصادقة لوحة التحكم
 * ============================================================================
 *  جلسة JWT موقّع في كوكي:
 *
 *   • httpOnly   → لا يقرأه أي سكربت، فحتى مع XSS لا تُسرق الجلسة.
 *   • sameSite=lax → لا يُرسل مع طلبات من مواقع أخرى (+ فحص Origin في الـ proxy).
 *   • secure + __Host- في الإنتاج → HTTPS فقط وبلا نطاق (انظر session-token.ts).
 *   • عمر قصير بتجديد منزلق (ساعتان خمول / ١٢ ساعة سقف) — يجدّده الـ proxy.
 *
 *  التوكن لا يحمل الدور؛ كل تحقق يقرأ الحساب من القاعدة (فعّال؟ نفس بصمة كلمة
 *  المرور؟ ما دوره الآن؟) فتعطيل حساب أو تغيير كلمة مروره يُبطل جلساته فورًا.
 *
 *  لا سرّ افتراضي في الإنتاج: انظر src/lib/security/env.ts.
 * ============================================================================
 */

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

// ---------------------------------------------------------------------------
// كلمات المرور
// ---------------------------------------------------------------------------

/** عامل تكلفة ١٢ — توصية OWASP الدنيا ١٠؛ ١٢ توازن جيد بين مقاومة التخمين وزمن الدخول. */
const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

/**
 * تجزئة حقيقية بنفس التكلفة تُقارَن بها كلمة المرور عندما لا يوجد الحساب.
 * (تجزئة غير صالحة الشكل تُرفض فورًا فيظهر فرق زمني يكشف وجود الحساب.)
 */
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHash ??= hash(`dummy:${crypto.randomUUID()}`, BCRYPT_COST);
  return dummyHash;
}

// ---------------------------------------------------------------------------
// الجلسة
// ---------------------------------------------------------------------------

export async function createSession(user: SessionUser): Promise<void> {
  const record = await prisma.adminUser.findUnique({
    where: { id: user.id },
    select: { passwordHash: true, isActive: true },
  });
  if (!record || !record.isActive) throw new Error("UNAUTHORIZED");

  const { token, maxAge } = await signSessionToken({
    userId: user.id,
    securityStamp: securityStamp(record.passwordHash),
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  // set بنفس السمات (لا delete): بادئة __Host- تتطلب Secure حتى عند المسح
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), expires: new Date(0) });
}

/**
 * قراءة الجلسة الحالية **مع التحقق العميق** (توقيع + الحساب فعّال + البصمة).
 * cache() يمنع التكرار داخل الطلب الواحد.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const verified = await verifySessionToken(token);
    return verified?.user ?? null;
  } catch {
    // فشل بنيوي (مثل سرّ غير صالح في الإنتاج): نفشل مغلقين
    return null;
  }
});

/** يتطلب جلسة إدارة صالحة وحسابًا فعّالًا. الدور هنا هو دور القاعدة الحالي. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

/** يتطلب أحد الأدوار المذكورة (مثلًا OWNER لإدارة المستخدمين). */
export async function requireRole(...roles: AdminRole[]): Promise<SessionUser> {
  const session = await requireAdmin();
  if (!roles.includes(session.role)) {
    logSecurityEvent("forbidden", { userId: session.id, role: session.role });
    throw new Error("FORBIDDEN");
  }
  return session;
}

// ---------------------------------------------------------------------------
// تسجيل الدخول
// ---------------------------------------------------------------------------

/** رسالة واحدة موحّدة لكل أسباب الفشل — تفريقها يكشف أي البريدات مسجّل لدينا. */
export const GENERIC_LOGIN_ERROR = "بيانات الدخول غير صحيحة.";

/**
 * محاولة تسجيل الدخول (التحقق من البيانات فقط؛ التقييد والتسجيل في الإجراء).
 * زمن التنفيذ متساوٍ تقريبًا سواء وُجد الحساب أم لا.
 */
export async function authenticate(
  email: string,
  password: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.isActive) {
    await compare(password, await getDummyHash());
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false, error: GENERIC_LOGIN_ERROR };

  if (process.env.NODE_ENV === "production" && isKnownDefaultPassword(password)) {
    // نسمح بالدخول (لا نقفل المالك خارج نظامه) لكن نصرخ في السجلّ
    logSecurityEvent(
      "login_weak_default_password",
      { email: maskEmail(normalizedEmail) },
      "error",
    );
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AdminRole,
    },
  };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
