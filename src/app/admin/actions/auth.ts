"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  authenticate,
  createSession,
  destroySession,
  GENERIC_LOGIN_ERROR,
} from "@/lib/auth";
import { clientIp } from "@/lib/security/ip";
import {
  checkLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/security/login-throttle";
import { logSecurityEvent, maskEmail } from "@/lib/security/log";
import { verifySameOrigin } from "@/lib/security/origin";
import { safeAdminNext } from "@/lib/security/safe-redirect";
import { loginSchema } from "@/lib/validation";

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
};

/**
 * تسجيل الدخول للوحة التحكم.
 *
 * الطبقات بالترتيب:
 *   ١. فحص الأصل (Origin) — حتى لو سقط فحص الـ proxy لأي سبب.
 *   ٢. التحقق من الشكل (Zod) — بلا أي استعلام قاعدة بيانات.
 *   ٣. التقييد: قفل متصاعد لكل (IP+بريد) و IP و بريد — قبل bcrypt المكلف.
 *   ٤. التحقق من البيانات برسالة موحّدة وبزمن متساوٍ سواء وُجد الحساب أم لا.
 *   ٥. إعادة التوجيه إلى `next` بعد تنقيته (safeAdminNext) — لا تحويل مفتوح.
 */
export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);

  const origin = verifySameOrigin(requestHeaders);
  if (!origin.ok) {
    logSecurityEvent("origin_rejected", { where: "loginAction", reason: origin.reason, ip });
    return { error: GENERIC_LOGIN_ERROR };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: LoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "email" || key === "password") fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password } = parsed.data;

  const gate = checkLoginAllowed(ip, email);
  if (!gate.allowed) {
    logSecurityEvent("login_throttled", {
      ip,
      email: maskEmail(email),
      retryAfter: gate.retryAfter,
    });
    const minutes = Math.max(1, Math.ceil(gate.retryAfter / 60));
    return {
      error: `محاولات كثيرة فاشلة. حاول مرة أخرى بعد ${minutes} ${minutes === 1 ? "دقيقة" : "دقائق"}.`,
    };
  }

  const result = await authenticate(email, password);

  if (!result.ok) {
    recordLoginFailure(ip, email);
    logSecurityEvent("login_failed", { ip, email: maskEmail(email) });
    return { error: result.error };
  }

  recordLoginSuccess(ip, email);
  await createSession(result.user);
  logSecurityEvent(
    "login_success",
    { ip, userId: result.user.id, email: maskEmail(result.user.email) },
    "info",
  );

  redirect(safeAdminNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  const requestHeaders = await headers();

  // تسجيل الخروج يغيّر الحالة: نفس فحص الأصل (يمنع إخراج المدير عبر موقع آخر)
  const origin = verifySameOrigin(requestHeaders);
  if (!origin.ok) {
    logSecurityEvent("origin_rejected", {
      where: "logoutAction",
      reason: origin.reason,
      ip: clientIp(requestHeaders),
    });
    redirect("/admin");
  }

  await destroySession();
  logSecurityEvent("logout", { ip: clientIp(requestHeaders) }, "info");
  redirect("/admin/login");
}
