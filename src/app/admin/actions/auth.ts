"use server";

import { redirect } from "next/navigation";

import { authenticate, createSession, destroySession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
};

/**
 * تسجيل الدخول للوحة التحكم.
 *
 * يعيد التوجيه بعد نجاح المصادقة. `next` يُقبل فقط إن كان مسارًا داخليًا
 * يبدأ بـ /admin — بدون هذا الفحص يصبح الرابط أداة تحويل مفتوح
 * (open redirect) تُستخدم في التصيّد.
 */
export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
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

  const result = await authenticate(parsed.data.email, parsed.data.password);

  if (!result.ok) {
    return { error: result.error };
  }

  await createSession(result.user);

  const requested = formData.get("next");
  const destination =
    typeof requested === "string" &&
    requested.startsWith("/admin") &&
    !requested.startsWith("//")
      ? requested
      : "/admin";

  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
