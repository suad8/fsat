import { headers } from "next/headers";

import { requireAdmin } from "@/lib/auth";
import { clientIp } from "@/lib/security/ip";
import type { AuditActor } from "@/lib/data/audit";

/**
 * سياق إجراء الإدارة: من ينفّذ (للتدقيق) ومن أي عنوان.
 *
 * يرمي "UNAUTHORIZED" إن لم تكن هناك جلسة فعّالة — نفس عقد requireAdmin،
 * فتبقى كتل `try { … } catch { return { error: "انتهت جلستك" } }` في
 * الإجراءات كما هي.
 */

export type AdminContext = {
  actor: AuditActor;
  role: string;
  ip: string | null;
};

/**
 * عنوان العميل لسجلّ التدقيق. نستعمل المحلّل الآمن نفسه المستعمل في الحماية
 * (العنصر الذي أضافه الوكيل الموثوق) لأن أول عنصر في x-forwarded-for يكتبه العميل.
 */
export async function requestIp(): Promise<string | null> {
  try {
    const ip = clientIp(await headers());
    return ip && ip !== "unknown" ? ip.slice(0, 64) : null;
  } catch {
    return null;
  }
}

export async function getAdminContext(): Promise<AdminContext> {
  const session = await requireAdmin();

  return {
    actor: { id: session.id, email: session.email, name: session.name },
    role: session.role,
    ip: await requestIp(),
  };
}
