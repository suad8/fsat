"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  saveSeoDefaultsAction,
  type SettingsState,
} from "@/app/admin/(dashboard)/actions/settings";
import { useToast } from "@/components/admin/Feedback";
import { SaveBar, useSaveShortcut } from "@/components/admin/FormKit";
import { Alert } from "@/components/ui/Alert";
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
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) toast.success("تم حفظ الإعدادات الافتراضية");
    if (state.error) toast.error("تعذّر الحفظ", state.error);
  }, [state, toast]);

  useSaveShortcut(() => formRef.current?.requestSubmit());

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {state.error ? (
        <Alert tone="danger" live>
          {state.error}
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

      <SaveBar inline submit saveLabel="حفظ" />
    </form>
  );
}
