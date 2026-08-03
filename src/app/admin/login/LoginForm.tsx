"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginState } from "@/app/admin/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      ) : null}

      <input type="hidden" name="next" value={next} />

      <TextInput
        id="email"
        name="email"
        label="البريد الإلكتروني"
        type="email"
        required
        autoComplete="username"
        autoFocus
        placeholder="admin@example.com"
        error={state.fieldErrors?.email}
      />

      <TextInput
        id="password"
        name="password"
        label="كلمة المرور"
        type="password"
        required
        autoComplete="current-password"
        error={state.fieldErrors?.password}
      />

      <SubmitButton />
    </form>
  );
}

/**
 * useFormStatus يقرأ حالة الإرسال من أقرب <form> أعلاه، لذا يجب أن يكون
 * في مكوّن منفصل داخل النموذج لا في المكوّن الذي يحوي النموذج نفسه.
 */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" fullWidth disabled={pending}>
      {pending ? "جارٍ التحقق…" : "تسجيل الدخول"}
    </Button>
  );
}
