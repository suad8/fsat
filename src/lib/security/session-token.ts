import { jwtVerify, SignJWT } from "jose";

import { getAuthSecret, isProduction } from "@/lib/security/env";

/**
 * توكن جلسة الإدارة (JWT / HS256).
 *
 * التوكن يحمل هوية فقط (sub) + بصمة أمان (sv) + زمن بدء الجلسة الأصلي (iat0).
 * الدور والاسم والبريد لا تُخزَّن فيه عمدًا: المرجع دائمًا القاعدة، فتغيير دور
 * أو تعطيل حساب يسري فورًا لا بعد انتهاء توكن قديم.
 *
 * العمر:
 *   • خمول: ساعتان من آخر تجديد (exp).
 *   • تجديد منزلق: يُصدَر توكن جديد إن مضى أكثر من ٢٠ دقيقة على الحالي.
 *   • سقف مطلق: ١٢ ساعة من لحظة تسجيل الدخول لا يتجاوزه التجديد.
 */

export const SESSION_ISSUER = "fsat";
export const SESSION_AUDIENCE = "fsat-admin";

export const IDLE_TTL_SECONDS = 2 * 60 * 60;
export const ABSOLUTE_TTL_SECONDS = 12 * 60 * 60;
export const RENEW_AFTER_SECONDS = 20 * 60;

/**
 * في الإنتاج نستعمل البادئة __Host- فيرفض المتصفّح الكوكي ما لم يكن Secure
 * وبلا Domain وبمسار "/" — فلا يمكن لنطاق فرعي مخترَق زرع كوكي جلسة.
 */
export const SESSION_COOKIE = isProduction() ? "__Host-fsat_admin" : "fsat_admin_session";

export type SessionClaims = {
  /** معرّف المستخدم. */
  sub: string;
  /** بصمة كلمة المرور الحالية — تغييرها يُبطل كل الجلسات القائمة. */
  sv: string;
  /** لحظة تسجيل الدخول الأصلي (ثوانٍ) — أساس السقف المطلق. */
  iat0: number;
  iat: number;
  exp: number;
};

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function signSessionToken(input: {
  userId: string;
  securityStamp: string;
  /** يُمرَّر عند التجديد ليبقى السقف المطلق محسوبًا من الدخول الأصلي. */
  originalIssuedAt?: number;
}): Promise<{ token: string; maxAge: number }> {
  const now = Math.floor(Date.now() / 1000);
  const iat0 = input.originalIssuedAt ?? now;

  // لا يتجاوز التوكن السقف المطلق
  const exp = Math.min(now + IDLE_TTL_SECONDS, iat0 + ABSOLUTE_TTL_SECONDS);

  const token = await new SignJWT({ sv: input.securityStamp, iat0 })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.userId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setJti(crypto.randomUUID())
    .sign(getAuthSecret());

  return { token, maxAge: Math.max(exp - now, 0) };
}

/** يتحقق من التوقيع والجهة والمدة فقط (لا قاعدة بيانات). */
export async function readSessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      clockTolerance: 5,
    });

    const { sub, sv, iat0, iat, exp } = payload as Record<string, unknown>;

    if (
      typeof sub !== "string" ||
      sub.length === 0 ||
      typeof sv !== "string" ||
      typeof iat0 !== "number" ||
      typeof iat !== "number" ||
      typeof exp !== "number"
    ) {
      return null;
    }

    // السقف المطلق: حتى لو كان exp صالحًا
    if (Math.floor(Date.now() / 1000) > iat0 + ABSOLUTE_TTL_SECONDS) return null;

    return { sub, sv, iat0, iat, exp };
  } catch {
    // توقيع خاطئ، منتهٍ، جهة مختلفة، أو سرّ غير صالح في الإنتاج
    return null;
  }
}
