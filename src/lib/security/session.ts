import { createHmac, timingSafeEqual } from "node:crypto";

import type { AdminRole } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getAuthSecret } from "@/lib/security/env";
import { readSessionToken, type SessionClaims } from "@/lib/security/session-token";

/**
 * التحقق العميق من الجلسة: توقيع التوكن + الحساب في القاعدة.
 *
 * يُستعمل من requireAdmin/getSession (الصفحات والإجراءات ومسارات API) ومن الـ
 * proxy أيضًا — فتعطيل حساب أو تغيير كلمة مروره يُبطل جلساته القائمة فورًا،
 * ولا يعتمد أمان أي صفحة على أن "الـ layout سيعيد التوجيه".
 */

export type VerifiedSession = {
  claims: SessionClaims;
  user: { id: string; email: string; name: string; role: AdminRole };
};

/**
 * بصمة الأمان: HMAC لتجزئة كلمة المرور بسرّ التطبيق.
 * لا تكشف شيئًا عن التجزئة، وتتغيّر فور تغيير كلمة المرور فتُبطل الجلسات.
 */
export function securityStamp(passwordHash: string): string {
  return createHmac("sha256", getAuthSecret())
    .update(`stamp:${passwordHash}`)
    .digest("hex")
    .slice(0, 32);
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function verifySessionToken(token: string): Promise<VerifiedSession | null> {
  const claims = await readSessionToken(token);
  if (!claims) return null;

  const user = await prisma.adminUser.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });

  if (!user || !user.isActive) return null;
  if (!safeEqual(claims.sv, securityStamp(user.passwordHash))) return null;

  return {
    claims,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AdminRole,
    },
  };
}
