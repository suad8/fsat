"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import {
  saveResourceAction,
  type ResourceState,
} from "@/app/admin/(dashboard)/actions/resource";
import { ImageField } from "@/components/admin/ImageField";
import { useToast } from "@/components/admin/Feedback";
import { FormSection, SaveBar, useSaveShortcut } from "@/components/admin/FormKit";
import { Alert } from "@/components/ui/Alert";
import { Checkbox, Select, TextArea, TextInput } from "@/components/ui/Field";
import type { FieldDef } from "@/lib/admin/resources";

/**
 * نموذج عام يُبنى من تعريف حقول المورد.
 *
 * يستخدم useActionState فيعمل النموذج بالإرسال العادي حتى قبل تحميل
 * الـ JavaScript، ثم يتحسّن تدريجيًا بعرض حالة الإرسال وأخطاء الحقول.
 */
export function EntityForm({
  resource,
  fields,
  record,
  listHref,
  title = "البيانات",
}: {
  resource: string;
  fields: FieldDef[];
  record?: Record<string, unknown> | null;
  listHref: string;
  /** عنوان القسم الرئيسي. */
  title?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<ResourceState, FormData>(
    saveResourceAction,
    {},
  );

  const id = typeof record?.id === "string" ? record.id : "";

  // بعد نجاح الحفظ نعود للقائمة ونحدّثها
  useEffect(() => {
    if (state.ok) {
      toast.success(id ? "تم حفظ التعديلات" : "تمت الإضافة");
      router.push(listHref);
      router.refresh();
    }
  }, [state.ok, router, listHref, toast, id]);

  useEffect(() => {
    if (state.error) toast.error("تعذّر الحفظ", state.error);
  }, [state.error, toast]);

  useSaveShortcut(() => formRef.current?.requestSubmit());

  const seoFields = fields.filter((field) => field.name.startsWith("seo"));
  const mainFields = fields.filter((field) => !field.name.startsWith("seo"));
  const errorCount = Object.keys(state.fieldErrors ?? {}).length;

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <input type="hidden" name="__resource" value={resource} />
      {id ? <input type="hidden" name="__id" value={id} /> : null}

      {state.error ? (
        <Alert tone="danger" live title="تعذّر الحفظ">
          {state.error}
        </Alert>
      ) : null}

      <FormSection id="main" title={title} invalidCount={errorCount}>
        <div className="grid gap-5 md:grid-cols-2">
          {mainFields.map((field) => (
            <FieldRenderer
              key={field.name}
              field={field}
              value={record?.[field.name]}
              error={state.fieldErrors?.[field.name]}
            />
          ))}

          {/* كلمة المرور حقل خاص بمستخدمي اللوحة ولا يُقرأ من القاعدة */}
          {resource === "users" ? (
            <TextInput
              id="password"
              name="password"
              label={id ? "كلمة مرور جديدة" : "كلمة المرور"}
              type="password"
              autoComplete="new-password"
              required={!id}
              optional={Boolean(id)}
              error={state.fieldErrors?.password}
              help={
                id
                  ? "اتركها فارغة للإبقاء على كلمة المرور الحالية."
                  : "١٠ أحرف على الأقل. استخدم كلمة مرور فريدة لا تستخدمها في مكان آخر."
              }
            />
          ) : null}
        </div>
      </FormSection>

      {seoFields.length > 0 ? (
        <FormSection
          id="seo"
          title="تحسين محركات البحث"
          defaultOpen={false}
          summary="عنوان ووصف نتائج البحث"
        >
          <div className="grid gap-5 md:grid-cols-2">
            {seoFields.map((field) => (
              <FieldRenderer
                key={field.name}
                field={field}
                value={record?.[field.name]}
                error={state.fieldErrors?.[field.name]}
              />
            ))}
          </div>
        </FormSection>
      ) : null}

      <SaveBar
        submit
        saveLabel={id ? "حفظ التعديلات" : "إضافة"}
        cancelHref={listHref}
        errorCount={errorCount}
      />
    </form>
  );
}

// ---------------------------------------------------------------------------

function FieldRenderer({
  field,
  value,
  error,
}: {
  field: FieldDef;
  value: unknown;
  error?: string;
}) {
  const wide = field.wide ? "md:col-span-2" : undefined;

  switch (field.type) {
    case "checkbox":
      return (
        <div className={wide ?? "md:col-span-2"}>
          <Checkbox
            id={field.name}
            name={field.name}
            label={field.label}
            description={field.help}
            defaultChecked={
              typeof value === "boolean" ? value : Boolean(field.defaultValue)
            }
            error={error}
          />
        </div>
      );

    case "image":
      return (
        <div className={wide}>
          <ImageField
            name={field.name}
            label={field.label}
            defaultValue={typeof value === "string" ? value : null}
            help={field.help}
          />
        </div>
      );

    case "select":
      return (
        <Select
          id={field.name}
          name={field.name}
          label={field.label}
          required={field.required}
          optional={!field.required}
          help={field.help}
          error={error}
          wrapperClassName={wide}
          defaultValue={
            typeof value === "string" ? value : String(field.defaultValue ?? "")
          }
        >
          {!field.required ? <option value="">— بدون —</option> : null}
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );

    case "multiselect":
      // قائمة نصية بسطر لكل قيمة — أبسط وأسرع في الاستخدام من قائمة متعددة
      return (
        <TextArea
          id={field.name}
          name={field.name}
          label={field.label}
          required={field.required}
          optional={!field.required}
          help={field.help ?? "قيمة واحدة في كل سطر."}
          error={error}
          rows={5}
          wrapperClassName={wide}
          defaultValue={Array.isArray(value) ? (value as string[]).join("\n") : ""}
        />
      );

    case "keyValue":
      return (
        <TextArea
          id={field.name}
          name={field.name}
          label={field.label}
          required={field.required}
          optional={!field.required}
          help={field.help ?? "سطر لكل مواصفة بصيغة: الاسم / القيمة"}
          error={error}
          rows={5}
          wrapperClassName={wide}
          placeholder={"عرض الطباعة / ٣٢٠ سم\nالدقة / ١٤٤٠ dpi"}
          defaultValue={
            Array.isArray(value)
              ? (value as { label: string; value: string }[])
                  .map((entry) => `${entry.label} / ${entry.value}`)
                  .join("\n")
              : ""
          }
        />
      );

    case "textarea":
    case "markdown":
      return (
        <TextArea
          id={field.name}
          name={field.name}
          label={field.label}
          required={field.required}
          optional={!field.required}
          help={field.help}
          error={error}
          rows={field.type === "markdown" ? 16 : 4}
          placeholder={field.placeholder}
          wrapperClassName={wide ?? "md:col-span-2"}
          className={field.type === "markdown" ? "font-mono text-xs leading-relaxed" : undefined}
          defaultValue={typeof value === "string" ? value : ""}
        />
      );

    case "date":
      return (
        <TextInput
          id={field.name}
          name={field.name}
          label={field.label}
          type="date"
          required={field.required}
          optional={!field.required}
          help={field.help}
          error={error}
          wrapperClassName={wide}
          defaultValue={toDateInput(value)}
        />
      );

    case "number":
    case "price":
      return (
        <TextInput
          id={field.name}
          name={field.name}
          label={field.label}
          type="number"
          step={field.type === "price" ? "0.01" : "1"}
          required={field.required}
          optional={!field.required}
          help={field.help}
          error={error}
          placeholder={field.placeholder}
          wrapperClassName={wide}
          defaultValue={
            typeof value === "number"
              ? String(value)
              : value === null || value === undefined
                ? field.defaultValue !== undefined
                  ? String(field.defaultValue)
                  : ""
                : String(value)
          }
        />
      );

    default:
      return (
        <TextInput
          id={field.name}
          name={field.name}
          label={field.label}
          required={field.required}
          optional={!field.required}
          help={field.help}
          error={error}
          placeholder={field.placeholder}
          wrapperClassName={wide}
          defaultValue={typeof value === "string" ? value : ""}
        />
      );
  }
}

/** يحوّل قيمة التاريخ إلى صيغة YYYY-MM-DD التي يتطلبها <input type="date">. */
function toDateInput(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return "";
}
