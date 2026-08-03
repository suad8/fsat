import { compare, hash } from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

import type { AdminRole } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  مصادقة لوحة التحكم
 * ============================================================================
 *  جلسة قائمة على JWT موقّع محفوظ في كوكي httpOnly:
 *
 *   • httpOnly  → لا يمكن لأي سكربت في الصفحة قراءة الكوكي، فحتى لو حدثت
 *                 ثغرة XSS لا تُسرق الجلسة.
 *   • sameSite=lax → يمنع إرسال الكوكي مع طلبات من مواقع أخرى (CSRF)، مع
 *                 إبقاء التنقّل العادي بالروابط يعمل.
 *   • secure    → في الإنتاج فقط، حتى يعمل التطوير على http محليًا.
 *
 *  التوقيع يستخدم AUTH_SECRET. في الإنتاج غيابه يوقف التطبيق عمدًا بدل
 *  الرجوع لمفتاح افتراضي معروف — وهو ما يجعل تزوير الجلسات ممكنًا.
 * ============================================================================
 */

const COOKIE_NAME = "fsat_admin_session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET مفقود أو قصير. اضبط قيمة عشوائية بطول ٣٢ حرفًا على الأقل قبل النشر.",
      );
    }
    // للتطوير المحلي فقط — لا يُستخدم في الإنتاج بسبب الشرط أعلاه
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-please");
  }

  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// كلمات المرور
// ---------------------------------------------------------------------------

export function hashPassword(password: string): Promise<string> {
  // عامل تكلفة ١٢ — توازن معقول بين مقاومة التخمين وزمن تسجيل الدخول
  return hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

// ---------------------------------------------------------------------------
// الجلسة
// ---------------------------------------------------------------------------

export async function createSession(user: SessionUser): Promise<void> {
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * قراءة الجلسة الحالية.
 * cache() يمنع إعادة التحقق من التوقيع عند كل استدعاء داخل الطلب الواحد.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });

    if (!payload.sub || typeof payload.email !== "string") return null;

    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      role: (payload.role as AdminRole) ?? "ADMIN",
    };
  } catch {
    // توقيع غير صالح أو جلسة منتهية
    return null;
  }
});

/**
 * يتحقق من الجلسة **ومن أن الحساب ما زال فعّالاً في القاعدة**.
 *
 * التحقق من القاعدة مهم: تعطيل حساب مدير يجب أن يمنعه فورًا، لا أن ينتظر
 * انتهاء صلاحية التوكن بعد أيام.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");

  const user = await prisma.adminUser.findUnique({
    where: { id: session.id },
    select: { id: true, isActive: true },
  });

  if (!user || !user.isActive) throw new Error("UNAUTHORIZED");

  return session;
}

/** محاولة تسجيل الدخول. */
export async function authenticate(
  email: string,
  password: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail },
  });

  // رسالة واحدة موحّدة للحالتين — تفريقها يكشف أي البريدين مسجّل لدينا
  const genericError = "بيانات الدخول غير صحيحة.";

  if (!user || !user.isActive) {
    // نقارن مع تجزئة وهمية حتى يتساوى زمن الرد ولا يُستدل على وجود الحساب
    await compare(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    return { ok: false, error: genericError };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false, error: genericError };

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

export const SESSION_COOKIE_NAME = COOKIE_NAME;
