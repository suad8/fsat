import { createHash } from "node:crypto";

/**
 * السجلّ الأمني.
 *
 * يكتب سطر JSON واحدًا لكل حدث على stdout (تلتقطه منصة الاستضافة) ويحتفظ بآخر
 * الأحداث في الذاكرة لعرضها لاحقًا في لوحة الإدارة.
 *
 * ممنوع هنا تسجيل: كلمات المرور، التوكنات، الكوكيز، محتوى الرسائل، أو البريد
 * الكامل. البريد يُسجَّل مقنَّعًا + بصمة قصيرة تكفي للربط بين الأحداث.
 */

export type SecurityEventName =
  | "login_success"
  | "login_failed"
  | "login_throttled"
  | "login_weak_default_password"
  | "logout"
  | "session_rejected"
  | "unauthorized"
  | "forbidden"
  | "origin_rejected"
  | "method_rejected"
  | "rate_limited"
  | "honeypot_triggered"
  | "upload_rejected"
  | "upload_stored"
  | "private_file_read"
  | "invalid_request"
  | "payload_too_large"
  | "startup_warning";

type Primitive = string | number | boolean | null | undefined;

export type SecurityEvent = {
  ts: string;
  event: SecurityEventName;
  level: "info" | "warn" | "error";
  [key: string]: Primitive;
};

/** مفاتيح لا تُسجَّل قيمها أبدًا حتى لو مُرِّرت بالخطأ. */
const FORBIDDEN_KEYS = /pass(word)?|token|secret|cookie|authorization|hash|otp/i;

const RECENT_LIMIT = 200;
const recent: SecurityEvent[] = [];

/** يزيل المحارف التحكمية (منع حقن أسطر سجلّ مزيّفة) ويقصّ الطول. */
function clean(value: string, max = 200): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f  ]+/g, " ").slice(0, max);
}

/** a***@example.com + بصمة — لا يكشف البريد كاملًا. */
export function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const [local = "", domain = ""] = normalized.split("@");
  const fingerprint = createHash("sha256").update(normalized).digest("hex").slice(0, 10);
  const masked = `${local.slice(0, 1)}***@${domain.slice(0, 60)}`;
  return clean(`${masked}#${fingerprint}`, 120);
}

export function logSecurityEvent(
  event: SecurityEventName,
  details: Record<string, Primitive> = {},
  level: "info" | "warn" | "error" = "warn",
): void {
  const entry: SecurityEvent = { ts: new Date().toISOString(), event, level };

  for (const [key, value] of Object.entries(details)) {
    if (FORBIDDEN_KEYS.test(key)) continue;
    entry[key] = typeof value === "string" ? clean(value) : value;
  }

  recent.push(entry);
  if (recent.length > RECENT_LIMIT) recent.shift();

  const line = JSON.stringify({ type: "security", ...entry });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** آخر الأحداث (من ذاكرة هذه العملية فقط). */
export function recentSecurityEvents(limit = 50): SecurityEvent[] {
  return recent.slice(-limit).reverse();
}
