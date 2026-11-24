/**
 * أسرار البيئة — نقطة واحدة تقرّر ما إذا كان السرّ صالحًا.
 *
 * القاعدة: لا يوجد سرّ افتراضي في الإنتاج إطلاقًا. في الإنتاج غياب AUTH_SECRET
 * أو ضعفه يعني أن التطبيق يرفض البدء (انظر src/instrumentation.ts) ويرفض إصدار
 * أو قبول أي جلسة. في التطوير فقط يُستعمل سرّ صريح التسمية مع تحذير يُطبع مرة
 * واحدة، حتى لا يمرّ سرّ ضعيف دون أن ينتبه له أحد.
 */

/** سرّ التطوير — اسمه يصرّح أنه غير صالح للإنتاج، ولا يُستعمل أبدًا عند NODE_ENV=production. */
const DEV_ONLY_SECRET = "dev-only::NOT-FOR-PRODUCTION::fsat-local-session-secret";

export const MIN_SECRET_LENGTH = 32;

/** قيم شائعة يتركها الناس من الأمثلة والقوالب. */
const KNOWN_PLACEHOLDERS = [
  "change-me",
  "changeme",
  "dev-only",
  "your-secret",
  "your_secret",
  "secret-key",
  "replace-me",
  "example",
  "password",
];

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export type SecretProblem = "missing" | "too_short" | "placeholder" | "low_entropy";

/** يفحص قوة السرّ دون كشف قيمته. */
export function inspectSecret(secret: string | undefined): SecretProblem | null {
  if (!secret) return "missing";
  if (secret.length < MIN_SECRET_LENGTH) return "too_short";

  const lower = secret.toLowerCase();
  if (KNOWN_PLACEHOLDERS.some((word) => lower.includes(word))) return "placeholder";

  // سرّ مثل "aaaaaaaa…" أو "12121212…" ليس عشوائيًا مهما بلغ طوله
  if (new Set(secret).size < 10) return "low_entropy";

  return null;
}

const PROBLEM_MESSAGES: Record<SecretProblem, string> = {
  missing: "AUTH_SECRET غير مضبوط",
  too_short: `AUTH_SECRET أقصر من ${MIN_SECRET_LENGTH} حرفًا`,
  placeholder: "AUTH_SECRET يحتوي قيمة افتراضية/مثالًا معروفًا",
  low_entropy: "AUTH_SECRET ضعيف (تنوّع محارف منخفض)",
};

let warnedDev = false;

/**
 * السرّ المستعمل لتوقيع الجلسات.
 * @throws في الإنتاج إن كان السرّ مفقودًا أو ضعيفًا.
 */
export function getAuthSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  const problem = inspectSecret(raw);

  if (problem === null && raw) return new TextEncoder().encode(raw);

  if (isProduction()) {
    throw new Error(
      `${PROBLEM_MESSAGES[problem ?? "missing"]}. ` +
        "اضبط قيمة عشوائية بطول ٣٢ حرفًا على الأقل (مثال: openssl rand -base64 48).",
    );
  }

  if (!warnedDev) {
    warnedDev = true;
    console.warn(
      `[security] ${PROBLEM_MESSAGES[problem ?? "missing"]} — يُستعمل سرّ التطوير المعلَّم. ` +
        "لا يصلح هذا للإنتاج: التطبيق سيرفض البدء بدون AUTH_SECRET قوي.",
    );
  }

  return new TextEncoder().encode(DEV_ONLY_SECRET);
}

/** يُستدعى عند إقلاع الخادم: يرفض الإنتاج بسرّ ضعيف. */
export function assertProductionEnv(): void {
  if (!isProduction()) return;

  const problem = inspectSecret(process.env.AUTH_SECRET);
  if (problem) {
    throw new Error(
      `[security] رفض البدء: ${PROBLEM_MESSAGES[problem]}. ` +
        "اضبط قيمة عشوائية بطول ٣٢ حرفًا على الأقل (openssl rand -base64 48).",
    );
  }
}
