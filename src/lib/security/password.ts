/**
 * سياسة كلمات المرور.
 *
 * تُستعمل عند تهيئة حساب المالك (البذر) وعند إنشاء/تغيير مستخدمي اللوحة.
 * القاعدة: طول كافٍ + ليست من القوائم المعروفة/الافتراضية + ليست مشتقة من البريد.
 */

export const MIN_PASSWORD_LENGTH = 12;

/** كلمات المرور الافتراضية التي ظهرت في أمثلة المشروع أو شائعة جدًا. */
const DENYLIST = new Set(
  [
    "changeme!2026",
    "changeme",
    "change-me",
    "password",
    "password1",
    "password123",
    "passw0rd",
    "admin",
    "admin123",
    "administrator",
    "qwerty123",
    "123456789",
    "1234567890",
    "12345678",
    "letmein",
    "welcome1",
    "iloveyou",
    "p@ssw0rd",
  ].map((value) => value.toLowerCase()),
);

/** كلمة المرور الافتراضية التي يضعها البذر إن لم تُضبط ADMIN_PASSWORD. */
export const KNOWN_DEFAULT_PASSWORDS = ["ChangeMe!2026"];

export function validatePasswordStrength(
  password: string,
  context: { email?: string; name?: string } = {},
): { ok: true } | { ok: false; reason: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: `كلمة المرور يجب ألا تقل عن ${MIN_PASSWORD_LENGTH} حرفًا.` };
  }

  if (password.length > 200) {
    return { ok: false, reason: "كلمة المرور طويلة جدًا." };
  }

  const lower = password.toLowerCase();
  const compact = lower.replace(/[^a-z0-9]/g, "");

  if (DENYLIST.has(lower) || DENYLIST.has(compact)) {
    return { ok: false, reason: "كلمة المرور شائعة أو افتراضية. اختر غيرها." };
  }

  if (new Set(password).size < 5) {
    return { ok: false, reason: "كلمة المرور متكرّرة المحارف." };
  }

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password),
  ).length;
  if (classes < 3) {
    return {
      ok: false,
      reason: "استخدم ثلاثة أنواع على الأقل: حروف كبيرة، صغيرة، أرقام، رموز.",
    };
  }

  const local = context.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) {
    return { ok: false, reason: "كلمة المرور لا يجب أن تحتوي جزءًا من البريد الإلكتروني." };
  }

  return { ok: true };
}

/** صيغة قابلة للرمي — مناسبة لسكربتات البذر. */
export function assertStrongPassword(password: string, context?: { email?: string }): void {
  const verdict = validatePasswordStrength(password, context);
  if (!verdict.ok) throw new Error(verdict.reason);
}

export function isKnownDefaultPassword(password: string): boolean {
  return KNOWN_DEFAULT_PASSWORDS.includes(password);
}
