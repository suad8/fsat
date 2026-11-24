import { headers } from "next/headers";

import { requireAdmin } from "@/lib/auth";
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

/** عنوان العميل خلف الوكيل العكسي: أول عنوان في x-forwarded-for. */
export async function requestIp(): Promise<string | null> {
  try {
    const list = await headers();
    const forwarded = list.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || list.get("x-real-ip")?.trim();
    return ip ? ip.slice(0, 64) : null;
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
