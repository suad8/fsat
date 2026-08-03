"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveSeoDefaultsAction,
  type SettingsState,
} from "@/app/admin/(dashboard)/actions/settings";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextArea, TextInput } from "@/components/ui/Field";

/** تحرير العنوان والوصف الافتراضيين لمحركات البحث. */
export function SeoDefaultsForm({
  defaultTitle,
  defaultDescription,
}: {
  defaultTitle: string;
  defaultDescription: string;
}) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    saveSeoDefaultsAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <Alert tone="danger" live>
          {state.error}
        </Alert>
      ) : null}

      {state.ok ? (
        <Alert tone="success" live>
          تم حفظ الإعدادات.
        </Alert>
      ) : null}

      <TextInput
        id="defaultSeoTitle"
        name="defaultSeoTitle"
        label="العنوان الافتراضي"
        optional
        defaultValue={defaultTitle}
        maxLength={160}
        help="يظهر في تبويب المتصفّح وفي نتائج البحث للصفحات التي لا تحدّد عنوانًا خاصًا. يُفضّل ٥٠ – ٦٠ حرفًا."
      />

      <TextArea
        id="defaultSeoDescription"
        name="defaultSeoDescription"
        label="الوصف الافتراضي"
        optional
        rows={3}
        defaultValue={defaultDescription}
        maxLength={400}
        help="يظهر تحت العنوان في نتائج البحث. يُفضّل ١٥٠ – ١٦٠ حرفًا."
      />

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} icon={pending ? undefined : "check"}>
      {pending ? "جارٍ الحفظ…" : "حفظ"}
    </Button>
  );
}
