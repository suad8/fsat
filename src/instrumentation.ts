/**
 * يُنفَّذ مرة واحدة عند إقلاع الخادم وقبل قبول أي طلب.
 *
 * في الإنتاج: غياب AUTH_SECRET القوي يوقف التطبيق (رفض البدء) بدل أن يعمل بسرّ
 * معروف. لا يُنفَّذ أثناء `next build`، فلا يتعطّل البناء في CI بلا أسرار.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertProductionEnv, isProduction } = await import("@/lib/security/env");
  assertProductionEnv();

  if (!isProduction()) return;

  const { logSecurityEvent } = await import("@/lib/security/log");

  const allowed = process.env.ALLOWED_ORIGIN ?? "";
  if (/localhost|127\.0\.0\.1/.test(allowed)) {
    logSecurityEvent(
      "startup_warning",
      { issue: "ALLOWED_ORIGIN يسمح بـ localhost في الإنتاج — احذفه من متغيّرات البيئة" },
      "warn",
    );
  }

  if (!(process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://")) {
    logSecurityEvent(
      "startup_warning",
      { issue: "NEXT_PUBLIC_SITE_URL ليس https — لن يُفعَّل upgrade-insecure-requests" },
      "warn",
    );
  }
}
