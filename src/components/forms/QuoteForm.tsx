"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { FileUpload, type UploadedFile } from "@/components/forms/FileUpload";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox, OptionCard, Select, TextArea, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { SAUDI_CITIES } from "@/lib/constants";
import type { QuoteField } from "@/lib/quote-form-types";
import { cn } from "@/lib/utils";
import { whatsappReferenceUrl } from "@/lib/whatsapp";

/**
 * نموذج طلب عرض سعر.
 *
 * الحقول تأتي من قالب تحدّده الإدارة في لوحة التحكم (‎/admin/quote-fields)،
 * ما عدا أربعة حقول أساسية مثبّتة: الاسم والجوال والمدينة ووصف الطلب —
 * وهي الحد الأدنى الذي بدونه لا يمكن الرد على العميل أصلاً.
 *
 * variant="compact" يعرض الحقول الإلزامية فقط — يُستخدم في قسم التواصل
 * بالصفحة الرئيسية حيث يكون النموذج الكامل عائقًا لا مساعدًا.
 */
export function QuoteForm({
  fields,
  variant = "full",
  defaults,
}: {
  fields: QuoteField[];
  variant?: "full" | "compact";
  /** قيم ابتدائية قادمة من صفحة منتج أو مشروع. */
  defaults?: Record<string, string | undefined>;
}) {
  const compact = variant === "compact";

  // في النسخة المختصرة نعرض الإلزامي فقط حتى لا يطول النموذج في الرئيسية
  const visibleFields = compact ? fields.filter((field) => field.isRequired) : fields;

  const [designs, setDesigns] = useState<UploadedFile[]>([]);
  const [logos, setLogos] = useState<UploadedFile[]>([]);
  const [references, setReferences] = useState<UploadedFile[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrors({});
    setMessage(null);

    const form = new FormData(event.currentTarget);

    // إجابات الحقول القابلة للتخصيص — الاختيارات المتعددة تُجمع في مصفوفة
    const answers: Record<string, string | string[]> = {};
    for (const field of visibleFields) {
      if (field.type === "CHECKBOX") {
        const picked = form.getAll(`f_${field.key}`).filter((v): v is string => typeof v === "string");
        if (picked.length > 0) answers[field.key] = picked;
        continue;
      }
      const value = form.get(`f_${field.key}`);
      if (typeof value === "string" && value.trim()) answers[field.key] = value.trim();
    }

    const payload = {
      customerName: form.get("customerName"),
      phone: form.get("phone"),
      city: form.get("city"),
      description: form.get("description"),
      answers,
      acceptTerms: form.get("acceptTerms") === "on",
      website: form.get("website") ?? "",
      productSlug: defaults?.productSlug ?? "",
      attachments: [...designs, ...logos, ...references].map((file) => ({
        kind: file.kind ?? "REFERENCE",
        name: file.name,
        url: file.url,
        size: file.size,
        mimeType: file.mimeType,
      })),
    };

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setStatus("error");
        setErrors(result.errors ?? {});
        setMessage(result.message ?? "تعذّر إرسال الطلب.");
        return;
      }

      setStatus("success");
      setReference(result.reference);
    } catch {
      setStatus("error");
      setMessage("تعذّر الاتصال بالخادم. تحقّق من اتصالك وحاول مرة أخرى.");
    }
  }

  // --- شاشة التأكيد ---
  if (status === "success") {
    return (
      <div className="border-success-500/30 bg-success-50 rounded-xl border p-7 text-center md:p-10">
        <span className="bg-success-600 mx-auto mb-5 grid size-14 place-items-center rounded-full text-white">
          <Icon name="check" className="size-7" strokeWidth={2.5} />
        </span>

        <h3 className="text-xl font-bold md:text-2xl">تم استلام طلبك بنجاح</h3>

        <p className="text-primary-700 mx-auto mt-3 max-w-md text-sm leading-relaxed">
          سيراجع فريقنا مواصفات طلبك ويتواصل معك بعرض السعر ومدة التنفيذ خلال
          يوم عمل واحد.
        </p>

        {reference && reference !== "—" ? (
          <p className="border-success-500/30 bg-surface mt-5 inline-block rounded-lg border px-5 py-3">
            <span className="text-primary-500 block text-xs">الرقم المرجعي لطلبك</span>
            <span className="text-primary-950 mt-1 block font-mono text-lg font-bold" dir="ltr">
              {reference}
            </span>
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {reference && reference !== "—" ? (
            <ButtonLink
              href={whatsappReferenceUrl(reference, "quote")}
              external
              variant="whatsapp"
              icon="whatsapp"
            >
              متابعة الطلب على واتساب
            </ButtonLink>
          ) : null}
          <ButtonLink href="/shop" variant="outline">
            تصفّح المنتجات
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {status === "error" && message ? (
        <Alert tone="danger" live title="تعذّر إرسال الطلب">
          {message}
        </Alert>
      ) : null}

      {/* حقل فخّ — مخفي عن المستخدم ومقروء للروبوتات */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">اترك هذا الحقل فارغًا</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* --- الحقول الأساسية الثابتة --- */}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          id="customerName"
          label="الاسم"
          required
          autoComplete="name"
          placeholder="الاسم الكامل"
          error={errors.customerName}
        />

        <TextInput
          id="phone"
          label="رقم الجوال"
          type="tel"
          required
          autoComplete="tel"
          placeholder="05XXXXXXXX"
          error={errors.phone}
          help="سنتواصل معك على هذا الرقم."
        />

        <Select id="city" label="المدينة" required error={errors.city} defaultValue="">
          <option value="" disabled>
            اختر المدينة
          </option>
          {SAUDI_CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </Select>

        {/* --- الحقول القابلة للتخصيص من لوحة التحكم --- */}
        {visibleFields.map((field) => (
          <DynamicField
            key={field.id}
            field={field}
            error={errors[field.key]}
            defaultValue={defaults?.[field.key]}
          />
        ))}
      </div>

      <TextArea
        id="description"
        label="وصف الطلب"
        required
        rows={compact ? 3 : 5}
        placeholder="اشرح ما تحتاجه: نوع المنتج، الخامة، الألوان، وأي تفاصيل تساعدنا على تسعير دقيق."
        error={errors.description}
      />

      {!compact ? (
        <div className="grid gap-5 md:grid-cols-3">
          <FileUpload
            label="ملف التصميم"
            kind="DESIGN"
            value={designs}
            onChange={setDesigns}
            maxFiles={3}
            help="ملف التصميم الجاهز للطباعة إن توفّر."
          />
          <FileUpload
            label="الشعار"
            kind="LOGO"
            value={logos}
            onChange={setLogos}
            maxFiles={2}
            help="شعار منشأتك بأعلى دقة متاحة."
          />
          <FileUpload
            label="صورة توضيحية"
            kind="REFERENCE"
            value={references}
            onChange={setReferences}
            maxFiles={3}
            help="صورة لمنتج مشابه يوضّح ما تريده."
          />
        </div>
      ) : null}

      <Checkbox
        id="acceptTerms"
        name="acceptTerms"
        required
        error={errors.acceptTerms}
        label={
          <>
            أوافق على{" "}
            <Link
              href="/policies/terms"
              target="_blank"
              className="text-accent-700 font-bold underline underline-offset-2"
            >
              الشروط والأحكام
            </Link>{" "}
            و
            <Link
              href="/policies/privacy"
              target="_blank"
              className="text-accent-700 font-bold underline underline-offset-2"
            >
              سياسة الخصوصية
            </Link>
          </>
        }
      />

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={status === "submitting"}
        icon={status === "submitting" ? undefined : "document"}
      >
        {status === "submitting" ? "جارٍ الإرسال…" : "إرسال طلب عرض السعر"}
      </Button>

      <p className="text-primary-500 text-center text-xs">
        نرد على طلبات عروض الأسعار خلال يوم عمل واحد.
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------

/** يرسم حقلاً واحدًا حسب نوعه المعرّف في لوحة التحكم. */
function DynamicField({
  field,
  error,
  defaultValue,
}: {
  field: QuoteField;
  error?: string;
  defaultValue?: string;
}) {
  const id = `f_${field.key}`;
  const span = field.width === "FULL" ? "sm:col-span-2" : undefined;
  const common = {
    id,
    name: id,
    label: field.label,
    required: field.isRequired,
    optional: !field.isRequired,
    help: field.helpText ?? undefined,
    error,
    placeholder: field.placeholder ?? undefined,
    wrapperClassName: span,
  };

  if (field.type === "TEXTAREA") {
    return <TextArea {...common} rows={3} defaultValue={defaultValue} />;
  }

  if (field.type === "SELECT") {
    return (
      <Select {...common} defaultValue={defaultValue ?? ""}>
        <option value="" disabled={field.isRequired}>
          {field.isRequired ? "اختر…" : "— بدون —"}
        </option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    );
  }

  if (field.type === "RADIO" || field.type === "CHECKBOX") {
    const isRadio = field.type === "RADIO";

    return (
      <fieldset className={cn("min-w-0", span)}>
        <legend className="text-primary-800 mb-2.5 text-sm font-bold">
          {field.label}
          {!field.isRequired ? (
            <span className="text-primary-400 ms-1.5 text-xs font-medium">(اختياري)</span>
          ) : null}
        </legend>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {field.options.map((option, index) => (
            <OptionCard
              key={option}
              id={`${id}-${index}`}
              name={id}
              value={option}
              title={option}
              type={isRadio ? "radio" : "checkbox"}
              defaultChecked={
                defaultValue ? defaultValue === option : isRadio && index === 0
              }
            />
          ))}
        </div>

        {field.helpText ? (
          <p className="text-primary-500 mt-2 text-xs leading-relaxed">{field.helpText}</p>
        ) : null}

        {error ? (
          <p className="text-danger-600 mt-1.5 text-xs font-bold">{error}</p>
        ) : null}
      </fieldset>
    );
  }

  const inputType =
    field.type === "EMAIL"
      ? "email"
      : field.type === "PHONE"
        ? "tel"
        : field.type === "NUMBER"
          ? "number"
          : field.type === "DATE"
            ? "date"
            : "text";

  return <TextInput {...common} type={inputType} defaultValue={defaultValue} />;
}
