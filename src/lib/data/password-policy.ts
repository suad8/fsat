/**
 * ============================================================================
 *  سياسة كلمة مرور حساب الإدارة
 * ============================================================================
 *  وحدة خالصة تستعملها التهيئة (prisma/seed.ts) وإجراءات المستخدمين، ويمكن
 *  لمحور الحماية الاستفادة منها في أي نموذج لتغيير كلمة المرور.
 *
 *  في الإنتاج تُرفض كلمة المرور الضعيفة أو الافتراضية صراحةً؛ في التطوير
 *  تُقبل الأضعف مع تحذير، كي لا تُعطَّل تجربة المطوّر المحلية.
 * ============================================================================
 */

/** كلمات مرور افتراضية/شائعة معروفة — منها ما كان مكتوبًا في الكود سابقًا. */
const KNOWN_WEAK = new Set(
  [
    "changeme!2026",
    "changeme",
    "changeme123",
    "admin",
    "admin123",
    "admin1234",
    "administrator",
    "password",
    "password1",
    "password123",
    "passw0rd",
    "123456",
    "12345678",
    "123456789",
    "1234567890",
    "qwerty",
    "qwerty123",
    "letmein",
    "welcome",
    "welcome1",
    "iloveyou",
    "p@ssw0rd",
    "p@ssword",
    "secret",
    "test1234",
  ].map((value) => value.toLowerCase()),
);

export const MIN_PASSWORD_LENGTH_PRODUCTION = 12;
export const MIN_PASSWORD_LENGTH_DEVELOPMENT = 8;

export type PasswordCheck = { ok: true } | { ok: false; reasons: string[] };

export function checkAdminPassword(
  password: string,
  context: { email?: string; production: boolean },
): PasswordCheck {
  const reasons: string[] = [];
  const lower = password.toLowerCase();
  const minLength = context.production
    ? MIN_PASSWORD_LENGTH_PRODUCTION
    : MIN_PASSWORD_LENGTH_DEVELOPMENT;

  if (password.length < minLength) {
    reasons.push(`يجب ألا تقل عن ${minLength} أحرف.`);
  }
  if (password.length > 200) reasons.push("طويلة جدًا (الحد ٢٠٠ حرف).");

  if (KNOWN_WEAK.has(lower)) {
    reasons.push("كلمة مرور افتراضية أو شائعة معروفة.");
  }

  const local = context.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 3 && lower.includes(local)) {
    reasons.push("تحتوي على جزء من البريد الإلكتروني.");
  }

  if (/^(.)\1+$/.test(password)) reasons.push("حرف واحد مكرّر.");

  if (context.production) {
    const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
      pattern.test(password),
    ).length;
    if (classes < 3) {
      reasons.push("اجمع ٣ أنواع على الأقل: أحرف صغيرة، كبيرة، أرقام، رموز.");
    }
  }

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

/** عناوين بريد تجريبية لا تُقبل لحساب إنتاج. */
export function isPlaceholderEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return (
    domain === "example.com" ||
    domain === "example.org" ||
    domain === "example.net" ||
    domain === "localhost" ||
    domain.endsWith(".test") ||
    domain.endsWith(".invalid")
  );
}
