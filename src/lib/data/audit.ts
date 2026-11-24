import type { Prisma } from "@/generated/prisma/client";
import { prisma, type DbClient } from "@/lib/prisma";

/**
 * ============================================================================
 *  سجلّ التدقيق
 * ============================================================================
 *  من فعل ماذا ومتى. يُكتب من إجراءات الإدارة (src/app/admin/(dashboard)/actions)
 *  ومن خدمة الطلبات عند تغيّر الحالة.
 *
 *  • writeAudit  — يرمي عند الفشل: استعمله داخل معاملة حتى يتراجع الفعل كله
 *                  إن تعذّر تسجيله (لا فعل حسّاس بلا أثر).
 *  • logAudit    — يبتلع الخطأ ويسجّله في console: للأفعال الخفيفة خارج
 *                  المعاملات، فلا يمنع تعطّل السجلّ حفظ المنتج مثلاً.
 *
 *  السجلّ للإلحاق فقط: لا توجد دالة تعديل أو حذف هنا، والتنظيف الدوري
 *  (scripts/cleanup.ts) لا يمسّه إلا بخيار صريح.
 * ============================================================================
 */

export type AuditActor = {
  id: string;
  email: string;
  name: string;
};

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "SETTINGS_CHANGE"
  | "LOGIN"
  | "LOGOUT";

export type AuditEntry = {
  actor: AuditActor | null;
  action: AuditAction;
  /** اسم الكيان: Product, Order, SiteSettings, Coupon, AdminUser … */
  entity: string;
  entityId?: string | null;
  /** جملة عربية مقروءة تُعرض في الجدول. */
  summary: string;
  changes?: Record<string, unknown> | null;
  ip?: string | null;
};

export async function writeAudit(entry: AuditEntry, db: DbClient = prisma): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: entry.actor?.id ?? null,
      actorEmail: entry.actor?.email ?? null,
      actorName: entry.actor?.name ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      summary: entry.summary.slice(0, 500),
      changes: (entry.changes ?? undefined) as Prisma.InputJsonValue | undefined,
      ip: entry.ip ?? null,
    },
  });
}

export async function logAudit(entry: AuditEntry, db: DbClient = prisma): Promise<void> {
  try {
    await writeAudit(entry, db);
  } catch (error) {
    console.error("[audit] تعذّر تسجيل الحدث:", entry.action, entry.entity, error);
  }
}

// ---------------------------------------------------------------------------
// بناء الفروقات
// ---------------------------------------------------------------------------

/** حقول لا تُكتب في السجلّ أبدًا. */
const SECRET_FIELDS = new Set(["passwordHash", "password", "token", "secret"]);

const MAX_VALUE_LENGTH = 1000;

function comparable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  return value;
}

function clip(value: unknown): unknown {
  const normalized = comparable(value);
  if (typeof normalized === "string" && normalized.length > MAX_VALUE_LENGTH) {
    return `${normalized.slice(0, MAX_VALUE_LENGTH)}…`;
  }
  if (typeof normalized === "object" && normalized !== null) {
    const text = JSON.stringify(normalized);
    return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : normalized;
  }
  return normalized;
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));
}

/**
 * الحقول التي تغيّرت بين نسختين: { field: { from, to } }.
 * يعيد null إن لم يتغيّر شيء. الحقول السرّية تُسجَّل كتغيّر دون قيمتها.
 */
export function diffRecords(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>,
  options: { fields?: readonly string[]; ignore?: readonly string[] } = {},
): Record<string, { from: unknown; to: unknown }> | null {
  const ignore = new Set(["id", "createdAt", "updatedAt", ...(options.ignore ?? [])]);
  const keys = options.fields ?? Object.keys(after);
  const result: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of keys) {
    if (ignore.has(key) || !(key in after)) continue;

    const from = before?.[key];
    const to = after[key];
    if (sameValue(from, to)) continue;

    result[key] = SECRET_FIELDS.has(key)
      ? { from: "••••", to: "••••" }
      : { from: clip(from), to: clip(to) };
  }

  return Object.keys(result).length > 0 ? result : null;
}

/** لقطة مختصرة من الحقول المهمة لسجلات الإنشاء والحذف. */
export function snapshotRecord(
  record: Record<string, unknown> | null | undefined,
  fields: readonly string[],
): Record<string, unknown> | null {
  if (!record) return null;
  const snapshot: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in record && !SECRET_FIELDS.has(field)) snapshot[field] = clip(record[field]);
  }
  return snapshot;
}

// ---------------------------------------------------------------------------
// القراءة (لشاشة سجلّ التدقيق في لوحة الإدارة)
// ---------------------------------------------------------------------------

export type AuditFilter = {
  entity?: string;
  entityId?: string;
  actorId?: string;
  action?: AuditAction;
  limit?: number;
  /** معرّف آخر صف من الصفحة السابقة (ترقيم بالمؤشّر). */
  cursor?: string;
};

export async function listAuditLogs(filter: AuditFilter = {}) {
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);

  const rows = await prisma.auditLog.findMany({
    where: {
      ...(filter.entity ? { entity: filter.entity } : {}),
      ...(filter.entityId ? { entityId: filter.entityId } : {}),
      ...(filter.actorId ? { actorId: filter.actorId } : {}),
      ...(filter.action ? { action: filter.action } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return { items, nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null };
}
