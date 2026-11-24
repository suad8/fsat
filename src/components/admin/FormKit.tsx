"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { AdminIcon } from "@/components/admin/AdminIcon";
import { cn } from "@/lib/utils";

/**
 * لبنات النماذج الطويلة: أقسام قابلة للطي، شريط حفظ ثابت، اختصار Ctrl+S،
 * وتحذير مغادرة عند وجود تغييرات غير محفوظة.
 *
 * الأقسام المطويّة تبقى في DOM (مخفية بـ hidden) فلا تضيع قيم الحقول ولا تُحذف
 * من FormData — الطيّ للقراءة فقط وليس لإلغاء البيانات.
 */

const SECTIONS_EVENT = "adm:sections";

/** يفتح/يطوي كل أقسام الصفحة الحالية. */
export function SectionsToggle() {
  function dispatch(mode: "open" | "close") {
    window.dispatchEvent(new CustomEvent(SECTIONS_EVENT, { detail: mode }));
  }

  return (
    <div className="no-print flex items-center gap-1 text-xs">
      <button
        type="button"
        onClick={() => dispatch("open")}
        className="text-primary-600 hover:bg-surface-sunken hover:text-primary-900 min-h-8 rounded-md px-2.5 font-bold transition-colors"
      >
        فتح كل الأقسام
      </button>
      <span aria-hidden="true" className="text-primary-300">
        ·
      </span>
      <button
        type="button"
        onClick={() => dispatch("close")}
        className="text-primary-600 hover:bg-surface-sunken hover:text-primary-900 min-h-8 rounded-md px-2.5 font-bold transition-colors"
      >
        طيّ الكل
      </button>
    </div>
  );
}

export function FormSection({
  id,
  title,
  description,
  summary,
  invalidCount = 0,
  defaultOpen = true,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  /** سطر يظهر عند الطيّ ليذكّر بمحتوى القسم (مثلاً: «٣ صور»). */
  summary?: ReactNode;
  /** عدد الحقول الإلزامية الناقصة داخل القسم — يفتحه تلقائيًا. */
  invalidCount?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const isOpen = open || invalidCount > 0;

  useEffect(() => {
    function onSections(event: Event) {
      const mode = (event as CustomEvent<"open" | "close">).detail;
      setOpen(mode === "open");
    }
    window.addEventListener(SECTIONS_EVENT, onSections);
    return () => window.removeEventListener(SECTIONS_EVENT, onSections);
  }, []);

  return (
    <section
      id={`sec-${id}`}
      className="border-border bg-surface scroll-mt-24 rounded-xl border shadow-sm"
    >
      <h2 className="m-0 text-base">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setOpen(!isOpen)}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-start sm:px-5"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[0.95rem] font-bold">{title}</span>
              {invalidCount > 0 ? (
                <span className="bg-danger-50 text-danger-700 ring-danger-500/25 rounded-full px-2 py-0.5 text-[0.7rem] font-bold ring-1 ring-inset">
                  {invalidCount} حقل يحتاج مراجعة
                </span>
              ) : null}
            </span>
            {description && isOpen ? (
              <span className="text-primary-500 mt-0.5 block text-xs font-normal leading-relaxed">
                {description}
              </span>
            ) : null}
            {summary && !isOpen ? (
              <span className="text-primary-500 mt-0.5 block text-xs font-normal">{summary}</span>
            ) : null}
          </span>

          <AdminIcon
            name="chevronDown"
            strokeWidth={2}
            className={cn(
              "text-primary-400 size-4 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </h2>

      <div id={panelId} hidden={!isOpen} className="border-border border-t p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}

/**
 * شريط الحفظ الثابت أسفل الشاشة.
 *
 * فوق شريط الجوال السفلي (--adm-bnav-h). يعرض حالة التغييرات وعدد الحقول التي
 * تحتاج مراجعة، ويحمل اختصار Ctrl+S في تلميحه.
 */
export function SaveBar({
  pending = false,
  dirty,
  onSave,
  submit = false,
  saveLabel = "حفظ التعديلات",
  cancelHref,
  cancelLabel = "إلغاء",
  errorCount = 0,
  onShowErrors,
  extra,
}: {
  pending?: boolean;
  /** undefined = لا نتتبّع التغييرات (الزر دائمًا فعّال). */
  dirty?: boolean;
  onSave?: () => void;
  /** عند true يكون الزر type=submit داخل <form>. */
  submit?: boolean;
  saveLabel?: string;
  cancelHref?: string;
  cancelLabel?: string;
  errorCount?: number;
  onShowErrors?: () => void;
  extra?: ReactNode;
}) {
  const formStatus = useFormStatus();
  const busy = pending || formStatus.pending;
  const disabled = busy || dirty === false;

  return (
    <div
      className="no-print border-border bg-surface/95 sticky z-20 -mx-4 mt-6 border-t px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      style={{ bottom: "var(--adm-bnav-h, 0px)" }}
    >
      <div className="mx-auto flex max-w-[var(--adm-max,90rem)] flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type={submit ? "submit" : "button"}
          onClick={submit ? undefined : onSave}
          disabled={disabled}
          className="bg-primary-950 hover:bg-primary-900 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold text-white shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50"
        >
          {busy ? (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : (
            <AdminIcon name="check" className="size-[1.1rem]" strokeWidth={2.2} />
          )}
          {busy ? "جارٍ الحفظ…" : saveLabel}
        </button>

        {cancelHref ? (
          <Link
            href={cancelHref}
            className="border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-bold transition-colors"
          >
            {cancelLabel}
          </Link>
        ) : null}

        {extra}

        <div className="ms-auto flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {errorCount > 0 ? (
            <button
              type="button"
              onClick={onShowErrors}
              className="text-danger-700 hover:bg-danger-50 inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 font-bold"
            >
              <AdminIcon name="alert" className="size-4" strokeWidth={2} />
              {errorCount} حقل يحتاج مراجعة
            </button>
          ) : dirty ? (
            <span className="text-warning-700 inline-flex items-center gap-1.5 font-bold" role="status">
              <span aria-hidden="true" className="bg-warning-500 size-2 rounded-full" />
              تغييرات غير محفوظة
            </span>
          ) : dirty === false ? (
            <span className="text-primary-500 inline-flex items-center gap-1.5" role="status">
              <AdminIcon name="check" className="size-3.5" strokeWidth={2.2} />
              كل شيء محفوظ
            </span>
          ) : null}

          <span className="text-primary-400 hidden items-center gap-1 sm:inline-flex" aria-hidden="true">
            <kbd className="border-border rounded border px-1.5 py-0.5 font-mono text-[0.65rem]">Ctrl</kbd>
            +
            <kbd className="border-border rounded border px-1.5 py-0.5 font-mono text-[0.65rem]">S</kbd>
            للحفظ
          </span>
        </div>
      </div>
    </div>
  );
}

/** Ctrl/Cmd + S يحفظ بدل نافذة «حفظ الصفحة» الخاصة بالمتصفح. */
export function useSaveShortcut(onSave: () => void, enabled = true) {
  const saveRef = useRef(onSave);

  useEffect(() => {
    saveRef.current = onSave;
  });

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

/** يحذّر المتصفّح عند إغلاق التبويب أو تحديثه مع تغييرات غير محفوظة. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // المتصفحات الحديثة تتجاهل النص لكنها تتطلّب تعيين returnValue
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}

/** يقارن مسودة بنسختها الأولى. markSaved() يعتمد الحالة الحالية كنقطة بداية جديدة. */
export function useDirty<T>(draft: T) {
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const dirty = JSON.stringify(draft) !== baseline;

  return {
    dirty,
    /** مرّر المسودة التي أُرسلت فعلاً كي لا تُعدّ تعديلات ما بعد الإرسال محفوظة. */
    markSaved: (saved: T = draft) => setBaseline(JSON.stringify(saved)),
  };
}

/** يمرّر التركيز إلى أول حقل ناقص (بالترتيب المعطى) ويطوي الشاشة إليه. */
export function focusFirstInvalid(ids: string[]) {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      // بعد انتهاء التمرير نركّز دون أن نقفز مرة ثانية
      window.setTimeout(() => element.focus({ preventScroll: true }), 250);
      return;
    }
  }
}

/** رسالة موحّدة للحقل الإلزامي الفارغ. */
export const REQUIRED_MESSAGE = "هذا الحقل مطلوب";
