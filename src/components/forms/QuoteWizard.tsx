"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { useGSAP } from "@gsap/react";

import { FileUpload, type UploadedFile } from "@/components/forms/FileUpload";
import { toLatinDigits } from "@/components/pages/arabic";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox, OptionCard, Select, TextArea, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { SAUDI_CITIES } from "@/lib/constants";
import { gsap, MOTION_OK } from "@/lib/gsap";
import type { QuoteField } from "@/lib/quote-form-types";
import { cn } from "@/lib/utils";
import { whatsappReferenceUrl } from "@/lib/whatsapp";

/**
 * نموذج عرض السعر متعدد الخطوات (٣ خطوات خفيفة):
 *   ١ ما تحتاجه  ←  ٢ المواصفات والملف  ←  ٣ بياناتك
 *
 * - الحقول تأتي من قالب الإدارة (QuoteFormField) كما في النموذج القديم، موزّعة
 *   على الخطوات حسب مفتاحها؛ ما تضيفه الإدارة من حقول جديدة يظهر في الخطوة ٢.
 * - المسودة تُحفظ في المتصفح فقط (localStorage) وتُستعاد عند العودة، وتُمسح
 *   بعد الإرسال الناجح. لا شيء يُرسل للخادم قبل الضغط على «إرسال».
 * - التحقق هنا للراحة؛ الخادم يعيد التحقق من كل شيء.
 */

type Values = Record<string, string | string[]>;

type Files = { designs: UploadedFile[]; logos: UploadedFile[]; references: UploadedFile[] };

type Draft = {
  v: 1;
  step: number;
  values: Values;
  files: Files;
  savedAt: number;
  /** توقيع قيم الرابط وقت الحفظ — يميّز إعادة تحميل نفس الزيارة عن فتح رابط جديد. */
  sig: string;
};

export type QuoteWizardDefaults = {
  productType?: string;
  productSlug?: string;
  size?: string;
  quantity?: string;
  description?: string;
  /** وصف السياق الذي جاء منه العميل (خدمة، منتج، مشروع) لإظهار شارة «عبّأنا لك». */
  context?: string;
};

const DRAFT_KEY = "gpc.quote.draft.v1";

const STEPS = [
  { title: "ما تحتاجه", hint: "نوع الطلب والكمية" },
  { title: "المواصفات والملف", hint: "التفاصيل والتصميم" },
  { title: "بياناتك", hint: "لنرسل لك العرض" },
] as const;

/** الخطوة التي يظهر فيها كل حقل نظامي. أي حقل جديد من الإدارة يذهب للخطوة ٢. */
const STEP_OF: Record<string, number> = {
  productType: 0,
  quantity: 0,
  size: 1,
  dueDate: 1,
  preferredContact: 2,
  companyName: 2,
  email: 2,
};

const OPTIONAL_ON_STEP_3 = new Set(["companyName", "email"]);

const PHONE_RE = /^(?:\+?966|00966|0)?5\d{8}$/;

const EMPTY_FILES: Files = { designs: [], logos: [], references: [] };

// ---------------------------------------------------------------------------
// المسودة المحلية
// ---------------------------------------------------------------------------

function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (draft?.v !== 1 || typeof draft.values !== "object") return null;
    // مسودة أقدم من ١٤ يومًا لا قيمة لها
    if (Date.now() - draft.savedAt > 14 * 24 * 3600 * 1000) return null;
    return draft;
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* التخزين قد يكون معطّلًا (وضع خاص) — لا يؤثر على النموذج */
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* تجاهل */
  }
}

const noopSubscribe = () => () => {};

/**
 * الغلاف: يؤخّر رسم النموذج إلى ما بعد التركيب لأن المسودة تُقرأ من
 * localStorage (غير متاح على الخادم) — فلا يحدث اختلاف بين HTML الخادم والعميل.
 */
export function QuoteWizard(props: { fields: QuoteField[]; defaults?: QuoteWizardDefaults }) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div aria-busy="true" className="space-y-4" role="status">
        <span className="sr-only">جارٍ تحميل النموذج…</span>
        <div className="bg-surface-sunken h-3 w-1/3 animate-pulse rounded-full" />
        <div className="bg-surface-sunken h-14 animate-pulse rounded-xl" />
        <div className="bg-surface-sunken h-14 animate-pulse rounded-xl" />
        <div className="bg-surface-sunken h-12 w-40 animate-pulse rounded-xl" />
      </div>
    );
  }

  return <WizardInner {...props} />;
}

// ---------------------------------------------------------------------------

function WizardInner({
  fields,
  defaults,
}: {
  fields: QuoteField[];
  defaults?: QuoteWizardDefaults;
}) {
  // قيم الرابط (قادمة من صفحة خدمة/منتج/مشروع) تتقدّم على المسودة
  const [prefill] = useState<Values>(() => ({
    ...(defaults?.productType ? { f_productType: defaults.productType } : {}),
    ...(defaults?.quantity ? { f_quantity: defaults.quantity } : {}),
    ...(defaults?.size ? { f_size: defaults.size } : {}),
    ...(defaults?.description ? { description: defaults.description } : {}),
  }));
  const sig = JSON.stringify(prefill);
  const hasPrefill = Object.keys(prefill).length > 0;

  const [initial] = useState(() => {
    const draft = loadDraft();
    // نفس الزيارة (إعادة تحميل): نستعيد كل شيء كما تركه العميل.
    // رابط جديد بقيم مختلفة: قيم الرابط تتقدّم ونبدأ من الخطوة الأولى.
    const sameVisit = draft !== null && (draft.sig === sig || !hasPrefill);
    return {
      draft,
      step: draft && sameVisit ? draft.step : 0,
      values: sameVisit ? (draft?.values ?? {}) : { ...(draft?.values ?? {}), ...prefill },
    };
  });
  const restored =
    initial.draft &&
    (initial.draft.step > 0 ||
      Object.values(initial.draft.values).some((value) =>
        Array.isArray(value) ? value.length > 0 : String(value).trim().length > 0,
      ))
      ? initial.draft
      : null;
  const [dismissedRestore, setDismissedRestore] = useState(false);

  const [step, setStep] = useState(initial.step);
  const [values, setValues] = useState<Values>(initial.values);
  const [files, setFiles] = useState<Files>(restored?.files ?? EMPTY_FILES);
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepBody = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const productSlug = defaults?.productSlug ?? "";

  // --- حفظ المسودة عند كل تغيير ---
  useEffect(() => {
    if (status === "success") return;
    saveDraft({ v: 1, step, values, files, savedAt: Date.now(), sig });
  }, [step, values, files, status, sig]);

  // --- حركة هادئة عند تبديل الخطوة + نقل التركيز إلى عنوانها ---
  useGSAP(
    () => {
      if (firstRender.current) {
        firstRender.current = false;
        return;
      }
      const node = stepBody.current;
      if (!node) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          node,
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out", clearProps: "transform" },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [step, status] },
  );

  const stepFields = (index: number) =>
    fields.filter((field) => (STEP_OF[field.key] ?? 1) === index);

  const setValue = useCallback((key: string, value: string | string[]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const text = (key: string) => {
    const value = values[key];
    return typeof value === "string" ? value : "";
  };

  // --- التحقق لكل خطوة ---
  function validate(index: number): Record<string, string> {
    const found: Record<string, string> = {};

    for (const field of stepFields(index)) {
      const key = `f_${field.key}`;
      const value = values[key];
      const filled = Array.isArray(value) ? value.length > 0 : Boolean(value && value.trim());
      if (field.isRequired && !filled) {
        found[key] = field.type === "SELECT" ? "اختر من القائمة" : `${field.label} مطلوب`;
      } else if (field.type === "EMAIL" && filled && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
        found[key] = "صيغة البريد الإلكتروني غير صحيحة";
      }
    }

    if (index === 1 && text("description").trim().length < 10) {
      found.description = "اكتب وصفًا للطلب لا يقل عن ١٠ أحرف";
    }

    if (index === 2) {
      if (text("customerName").trim().length < 2) found.customerName = "الاسم مطلوب";
      const phone = toLatinDigits(text("phone")).replace(/[\s\-()]/g, "");
      if (!phone) found.phone = "رقم الجوال مطلوب";
      else if (!PHONE_RE.test(phone)) found.phone = "أدخل رقم جوال سعودي صحيح — مثال: 0512345678";
      if (!text("city").trim()) found.city = "اختر المدينة";
      if (!accept) found.acceptTerms = "يجب الموافقة على الشروط والأحكام";
    }

    return found;
  }

  function goTo(next: number) {
    setStep(next);
    setMessage(null);
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
      headingRef.current?.focus({ preventScroll: true });
    });
  }

  function handleNext() {
    const found = validate(step);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // نقل التركيز إلى أول حقل به خطأ
      requestAnimationFrame(() => {
        const first = Object.keys(found)[0];
        document.getElementById(first)?.focus();
      });
      return;
    }
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Enter داخل حقل في خطوة غير أخيرة = «التالي»، لا إرسال
    if (step < STEPS.length - 1) {
      handleNext();
      return;
    }

    // نتحقق من كل الخطوات قبل الإرسال لأن العميل قد يقفز بين الخطوات
    for (let index = 0; index < STEPS.length; index += 1) {
      const found = validate(index);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        goTo(index);
        return;
      }
    }

    setStatus("submitting");
    setErrors({});
    setMessage(null);

    const form = new FormData(event.currentTarget);

    const answers: Record<string, string | string[]> = {};
    for (const field of fields) {
      const value = values[`f_${field.key}`];
      if (Array.isArray(value)) {
        if (value.length > 0) answers[field.key] = value;
      } else if (typeof value === "string" && value.trim()) {
        answers[field.key] = value.trim();
      }
    }

    const payload = {
      customerName: text("customerName").trim(),
      phone: toLatinDigits(text("phone")).trim(),
      city: text("city"),
      description: text("description").trim(),
      answers,
      acceptTerms: accept,
      website: form.get("website") ?? "",
      productSlug,
      attachments: [...files.designs, ...files.logos, ...files.references].map((file) => ({
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
        // مفاتيح الخادم للحقول المخصّصة بلا بادئة f_
        const mapped: Record<string, string> = {};
        for (const [key, error] of Object.entries((result.errors ?? {}) as Record<string, string>)) {
          const isCore = ["customerName", "phone", "city", "description", "acceptTerms"].includes(key);
          mapped[isCore ? key : `f_${key}`] = error;
        }
        setErrors(mapped);
        setMessage(result.message ?? "تعذّر إرسال الطلب.");

        const failing = Object.keys(mapped)[0];
        if (failing) {
          const owner = fields.find((field) => `f_${field.key}` === failing);
          const target =
            failing === "description"
              ? 1
              : ["customerName", "phone", "city", "acceptTerms"].includes(failing)
                ? 2
                : (STEP_OF[owner?.key ?? ""] ?? 1);
          goTo(target);
        }
        return;
      }

      clearDraft();
      setReference(result.reference);
      setStatus("success");
      requestAnimationFrame(() => cardRef.current?.scrollIntoView({ block: "start" }));
    } catch {
      setStatus("error");
      setMessage("تعذّر الاتصال بالخادم. تحقّق من اتصالك وحاول مرة أخرى.");
    }
  }

  function restart() {
    clearDraft();
    setValues({});
    setFiles(EMPTY_FILES);
    setAccept(false);
    setErrors({});
    setStatus("idle");
    setReference(null);
    setStep(0);
    setDismissedRestore(true);
  }

  async function copyReference() {
    if (!reference) return;
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* الحافظة غير متاحة — الرقم ظاهر ويمكن نسخه يدويًا */
    }
  }

  // ------------------------------------------------------------------------
  // شاشة النجاح
  // ------------------------------------------------------------------------
  if (status === "success") {
    const hasRef = reference && reference !== "—";

    return (
      <div ref={cardRef} className="scroll-mt-28 text-center">
        <span className="bg-success-600 mx-auto mb-5 grid size-16 place-items-center rounded-full text-white">
          <Icon name="check" className="size-8" strokeWidth={2.5} />
        </span>

        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-black outline-none md:text-3xl"
        >
          وصلنا طلبك
        </h2>

        <p className="text-primary-600 mx-auto mt-3 max-w-md leading-relaxed">
          سيراجع فريقنا المواصفات ويتواصل معك بعرض السعر ومدة التنفيذ خلال يوم عمل.
        </p>

        {hasRef ? (
          <div className="border-accent-600/30 bg-accent-50/70 mx-auto mt-6 max-w-sm rounded-2xl border p-5">
            <p className="text-primary-600 text-xs">رقمك المرجعي — احتفظ به للمتابعة</p>
            <p className="text-primary-950 mt-1.5 font-mono text-2xl font-black" dir="ltr">
              {reference}
            </p>
            <button
              type="button"
              onClick={copyReference}
              className="text-accent-800 hover:text-accent-950 mt-2 inline-flex items-center gap-1.5 text-xs font-bold"
            >
              <Icon name={copied ? "check" : "file"} className="size-3.5" />
              {copied ? "تم النسخ" : "انسخ الرقم"}
            </button>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {hasRef ? (
            <ButtonLink
              href={whatsappReferenceUrl(reference as string, "quote")}
              external
              variant="whatsapp"
              icon="whatsapp"
            >
              تابع طلبك على واتساب
            </ButtonLink>
          ) : null}
          <ButtonLink href="/shop" variant="outline">
            تصفّح المتجر
          </ButtonLink>
          <button
            type="button"
            onClick={restart}
            className="text-primary-600 hover:text-primary-950 min-h-11 px-3 text-sm font-bold underline underline-offset-4"
          >
            طلب جديد
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // الخطوات
  // ------------------------------------------------------------------------
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const percent = ((step + 1) / STEPS.length) * 100;

  const renderField = (field: QuoteField) => (
    <FieldControl
      key={field.id}
      field={field}
      value={values[`f_${field.key}`]}
      error={errors[`f_${field.key}`]}
      onChange={(value) => setValue(`f_${field.key}`, value)}
    />
  );

  const step1Fields = stepFields(0);
  const step2Fields = stepFields(1);
  const step3Fields = stepFields(2);
  const step3Main = step3Fields.filter((field) => !OPTIONAL_ON_STEP_3.has(field.key));
  const step3Org = step3Fields.filter((field) => OPTIONAL_ON_STEP_3.has(field.key));
  const orgHasValue = step3Org.some((field) => text(`f_${field.key}`));

  return (
    <div ref={cardRef} className="scroll-mt-28">
      {/* --- شريط التقدّم --- */}
      <div className="mb-8">
        <div className="mb-3 flex items-end justify-between gap-4">
          <p className="text-primary-500 text-sm">
            الخطوة <span className="text-primary-950 font-black">{step + 1}</span> من{" "}
            {STEPS.length}
          </p>
          <p className="text-primary-500 hidden text-xs sm:block">{current.hint}</p>
        </div>

        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label={`التقدّم: الخطوة ${step + 1} من ${STEPS.length}`}
          className="bg-surface-sunken h-2 overflow-hidden rounded-full"
        >
          <div
            className="from-accent-400 to-accent-600 h-full rounded-full bg-gradient-to-l transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ol className="mt-4 grid grid-cols-3 gap-2">
          {STEPS.map((item, index) => {
            const done = index < step;
            const active = index === step;
            return (
              <li key={item.title}>
                <button
                  type="button"
                  disabled={index > step}
                  onClick={() => index < step && goTo(index)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-start text-xs font-bold transition-colors md:text-sm",
                    active ? "text-primary-950" : done ? "text-accent-800" : "text-primary-400",
                    index < step && "hover:bg-surface-muted",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-black md:size-7",
                      active
                        ? "bg-ink text-accent-400"
                        : done
                          ? "bg-accent-500 text-accent-contrast"
                          : "bg-surface-sunken text-primary-400",
                    )}
                  >
                    {done ? <Icon name="check" className="size-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                  <span className="min-w-0 leading-tight">{item.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {restored && !dismissedRestore ? (
        <div className="bg-info-50 border-info-500/25 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm">
          <p className="text-info-700 flex items-center gap-2 font-medium">
            <Icon name="info" className="size-4 shrink-0" />
            استعدنا مسودتك المحفوظة على هذا الجهاز.
          </p>
          <button
            type="button"
            onClick={restart}
            className="text-info-700 min-h-9 text-xs font-bold underline underline-offset-4"
          >
            ابدأ من جديد
          </button>
        </div>
      ) : null}

      {defaults?.context ? (
        <div className="border-accent-600/20 bg-accent-50/60 mb-6 flex items-start gap-3 rounded-xl border px-4 py-3">
          <Icon name="check" className="text-accent-700 mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
          <p className="text-primary-700 text-sm leading-relaxed">
            عبّأنا لك بعض الحقول: <span className="text-primary-950 font-bold">{defaults.context}</span>
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        {/* حقل فخّ — مخفي عن المستخدم ومقروء للروبوتات */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="qw-website">اترك هذا الحقل فارغًا</label>
          <input id="qw-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {status === "error" && message ? (
          <Alert tone="danger" live title="تعذّر إرسال الطلب" className="mb-6">
            {message}
          </Alert>
        ) : null}

        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mb-1.5 text-2xl font-black outline-none md:text-[1.75rem]"
        >
          {current.title}
        </h2>
        <p className="text-primary-500 mb-7 text-sm sm:hidden">{current.hint}</p>
        <div className="mb-7 hidden sm:block" />

        <div ref={stepBody} className="space-y-5">
          {step === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">{step1Fields.map(renderField)}</div>
          ) : null}

          {step === 1 ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2">{step2Fields.map(renderField)}</div>

              <TextArea
                id="description"
                label="وصف الطلب"
                required
                rows={5}
                value={text("description")}
                onChange={(event) => setValue("description", event.target.value)}
                placeholder="مثال: أحتاج علب حلويات بغطاء مغناطيسي، المقاس 20×15×6 سم، بشعار ذهبي على الغطاء."
                help="اذكر النوع والخامة والألوان وأي تفاصيل تهمّك. كلما اتّضحت الصورة كان السعر أدقّ."
                error={errors.description}
              />

              <details
                className="group border-border rounded-2xl border"
                open={files.designs.length + files.logos.length + files.references.length > 0}
              >
                <summary className="text-primary-800 flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold">
                  <span className="flex items-center gap-2.5">
                    <Icon name="upload" className="text-accent-700 size-5" />
                    إرفاق تصميم أو شعار أو صورة
                    <span className="text-primary-400 text-xs font-medium">(اختياري)</span>
                  </span>
                  <Icon
                    name="chevronDown"
                    className="text-primary-400 size-5 transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="border-border grid gap-5 border-t p-4 md:grid-cols-3">
                  <FileUpload
                    label="ملف التصميم"
                    kind="DESIGN"
                    value={files.designs}
                    onChange={(next) => setFiles((current) => ({ ...current, designs: next }))}
                    maxFiles={3}
                    help="الملف الجاهز للطباعة إن توفّر."
                  />
                  <FileUpload
                    label="الشعار"
                    kind="LOGO"
                    value={files.logos}
                    onChange={(next) => setFiles((current) => ({ ...current, logos: next }))}
                    maxFiles={2}
                    help="بأعلى دقة متاحة."
                  />
                  <FileUpload
                    label="صورة توضيحية"
                    kind="REFERENCE"
                    value={files.references}
                    onChange={(next) => setFiles((current) => ({ ...current, references: next }))}
                    maxFiles={3}
                    help="صورة لمنتج مشابه."
                  />
                </div>
              </details>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput
                  id="customerName"
                  label="الاسم"
                  required
                  autoComplete="name"
                  value={text("customerName")}
                  onChange={(event) => setValue("customerName", event.target.value)}
                  error={errors.customerName}
                />
                <TextInput
                  id="phone"
                  label="رقم الجوال"
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="05XXXXXXXX"
                  value={text("phone")}
                  onChange={(event) => setValue("phone", event.target.value)}
                  help="للتواصل بخصوص عرض السعر فقط."
                  error={errors.phone}
                />
                <Select
                  id="city"
                  label="المدينة"
                  required
                  value={text("city")}
                  onChange={(event) => setValue("city", event.target.value)}
                  error={errors.city}
                  wrapperClassName="sm:col-span-2"
                >
                  <option value="" disabled>
                    اختر المدينة
                  </option>
                  {SAUDI_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </Select>
              </div>

              {step3Main.map(renderField)}

              {step3Org.length > 0 ? (
                <details className="group" open={orgHasValue}>
                  <summary className="text-primary-600 hover:text-primary-950 flex cursor-pointer list-none items-center gap-2 text-sm font-bold">
                    <Icon
                      name="plus"
                      className="size-4 transition-transform group-open:rotate-45"
                      strokeWidth={2}
                    />
                    أضف بيانات منشأتك أو بريدك (اختياري)
                  </summary>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">{step3Org.map(renderField)}</div>
                </details>
              ) : null}

              <Checkbox
                id="acceptTerms"
                name="acceptTerms"
                required
                checked={accept}
                onChange={(event) => {
                  setAccept(event.target.checked);
                  setErrors((current) => ({ ...current, acceptTerms: "" }));
                }}
                error={errors.acceptTerms || undefined}
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
            </>
          ) : null}
        </div>

        {/* --- التنقّل --- */}
        <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <Button type="button" variant="ghost" size="lg" onClick={() => goTo(step - 1)} iconAfter="chevronRight">
              السابق
            </Button>
          ) : (
            <span aria-hidden="true" className="hidden sm:block" />
          )}

          {isLast ? (
            <Button
              type="submit"
              size="lg"
              variant="accent"
              disabled={status === "submitting"}
              icon={status === "submitting" ? undefined : "document"}
              className="sm:min-w-64"
            >
              {status === "submitting" ? "جارٍ الإرسال…" : "إرسال طلب عرض السعر"}
            </Button>
          ) : (
            <Button type="submit" size="lg" variant="accent" iconAfter="arrowLeft" className="sm:min-w-48">
              التالي
            </Button>
          )}
        </div>

        <p className="text-primary-500 mt-5 flex items-center justify-center gap-2 text-center text-xs">
          <Icon name="shield" className="size-3.5" />
          تُحفظ مسودتك على جهازك فقط، ولا يصلنا شيء قبل أن تضغط «إرسال».
        </p>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * نص المساعدة المحفوظ في القالب قد يكون ملاحظة للإدارة لا للعميل
 * (مثل «اترك الخيارات فارغة لتُملأ تلقائيًا…») — لا نعرضه للزائر.
 */
function publicHelp(field: QuoteField): string | undefined {
  const help = field.helpText?.trim();
  if (!help) return undefined;
  if (/تُملأ تلقائيًا|تملأ تلقائيا|اترك .* فارغ/.test(help)) return undefined;
  return help;
}

/** يرسم حقلاً واحدًا من قالب الإدارة كحقل مُتحكَّم به. */
function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: QuoteField;
  value: string | string[] | undefined;
  error?: string;
  onChange: (value: string | string[]) => void;
}) {
  const id = `f_${field.key}`;
  const span = field.width === "FULL" ? "sm:col-span-2" : undefined;
  const str = typeof value === "string" ? value : "";

  const common = {
    id,
    label: field.label,
    required: field.isRequired,
    optional: !field.isRequired,
    help: publicHelp(field),
    error,
    placeholder: field.placeholder ?? undefined,
    wrapperClassName: span,
  };

  if (field.type === "TEXTAREA") {
    return <TextArea {...common} rows={3} value={str} onChange={(e) => onChange(e.target.value)} />;
  }

  if (field.type === "SELECT") {
    return (
      <Select {...common} value={str} onChange={(e) => onChange(e.target.value)}>
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
    const picked = Array.isArray(value) ? value : str ? [str] : [];

    return (
      <fieldset className={cn("min-w-0", span)}>
        <legend className="text-primary-800 mb-2.5 text-sm font-bold">
          {field.label}
          {!field.isRequired ? (
            <span className="text-primary-400 ms-1.5 text-xs font-medium">(اختياري)</span>
          ) : null}
        </legend>

        <div className="grid gap-2.5 sm:grid-cols-3">
          {field.options.map((option, index) => (
            <OptionCard
              key={option}
              id={`${id}-${index}`}
              name={id}
              value={option}
              title={option}
              type={isRadio ? "radio" : "checkbox"}
              checked={picked.includes(option)}
              onChange={(event) => {
                if (isRadio) onChange(option);
                else
                  onChange(
                    event.target.checked
                      ? [...picked, option]
                      : picked.filter((item) => item !== option),
                  );
              }}
            />
          ))}
        </div>

        {publicHelp(field) ? (
          <p className="text-primary-500 mt-2 text-xs leading-relaxed">{publicHelp(field)}</p>
        ) : null}
        {error ? <p className="text-danger-600 mt-1.5 text-xs font-bold">{error}</p> : null}
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

  return (
    <TextInput {...common} type={inputType} value={str} onChange={(e) => onChange(e.target.value)} />
  );
}
