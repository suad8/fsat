"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcon";
import { cn } from "@/lib/utils";

/**
 * تغذية راجعة موحّدة للوحة التحكم: toast للنجاح والفشل، وحوار تأكيد بدل
 * `confirm()` المتصفّح (الذي لا يُنسَّق ولا يحترم الوضع الداكن ويُحجب أحيانًا
 * داخل الأطر).
 *
 * التنبيهات داخل منطقة aria-live: النجاح مهذّب (polite) والفشل حازم (assertive).
 */

type ToastTone = "success" | "error" | "info";

type ToastItem = { id: number; tone: ToastTone; text: string; detail?: string };

type ToastApi = {
  success: (text: string, detail?: string) => void;
  error: (text: string, detail?: string) => void;
  info: (text: string, detail?: string) => void;
};

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = زر أحمر لعمليات الحذف والإلغاء. */
  tone?: "danger" | "default";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ToastContext = createContext<ToastApi | null>(null);
const ConfirmContext = createContext<ConfirmFn | null>(null);

const NOOP_TOAST: ToastApi = { success() {}, error() {}, info() {} };

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP_TOAST;
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  // خارج المزوّد نرجع للحوار الأصلي كي لا يُحذف شيء دون سؤال
  return confirm ?? (async (options) => window.confirm(options.title));
}

const TONE_STYLE: Record<ToastTone, { box: string; icon: AdminIconName; iconBox: string }> = {
  success: {
    box: "border-success-500/30",
    icon: "check",
    iconBox: "bg-success-600 text-white",
  },
  error: {
    box: "border-danger-500/40",
    icon: "alert",
    iconBox: "bg-danger-600 text-white",
  },
  info: {
    box: "border-info-500/30",
    icon: "info",
    iconBox: "bg-info-600 text-white",
  },
};

export function AdminFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, text: string, detail?: string) => {
      const id = ++counter.current;
      setToasts((current) => [...current.slice(-3), { id, tone, text, detail }]);
      // الأخطاء تبقى أطول: القارئ يحتاج وقتًا ليفهم ما حدث
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), tone === "error" ? 9000 : 4500),
      );
    },
    [dismiss],
  );

  const toast = useMemo<ToastApi>(
    () => ({
      success: (text, detail) => push("success", text, detail),
      error: (text, detail) => push("error", text, detail),
      info: (text, detail) => push("info", text, detail),
    }),
    [push],
  );

  // --- حوار التأكيد ---
  const [dialog, setDialog] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setDialog({ ...options, resolve });
      }),
    [],
  );

  function close(value: boolean) {
    dialog?.resolve(value);
    setDialog(null);
  }

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
    },
    [],
  );

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        {/* فوق شريط الجوال السفلي وشريط الحفظ */}
        <div
          className="no-print pointer-events-none fixed inset-x-0 z-[80] flex flex-col items-center gap-2 px-4 lg:items-start lg:ps-8"
          style={{ bottom: "calc(var(--adm-bnav-h, 0px) + 5.25rem)" }}
        >
          <div role="status" aria-live="polite" className="contents">
            {toasts
              .filter((item) => item.tone !== "error")
              .map((item) => (
                <ToastCard key={item.id} item={item} onClose={() => dismiss(item.id)} />
              ))}
          </div>
          <div role="alert" aria-live="assertive" className="contents">
            {toasts
              .filter((item) => item.tone === "error")
              .map((item) => (
                <ToastCard key={item.id} item={item} onClose={() => dismiss(item.id)} />
              ))}
          </div>
        </div>

        {dialog ? <ConfirmDialog options={dialog} onClose={close} /> : null}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const style = TONE_STYLE[item.tone];

  return (
    <div
      className={cn(
        "adm-toast bg-surface text-primary-900 pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3.5 shadow-lg",
        style.box,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", style.iconBox)}
      >
        <AdminIcon name={style.icon} className="size-3.5" strokeWidth={2.4} />
      </span>

      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold">{item.text}</p>
        {item.detail ? (
          <p className="text-primary-600 mt-0.5 text-xs leading-relaxed">{item.detail}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="إغلاق التنبيه"
        className="text-primary-400 hover:bg-surface-sunken hover:text-primary-900 grid size-7 shrink-0 place-items-center rounded-md transition-colors"
      >
        <AdminIcon name="close" className="size-4" />
      </button>
    </div>
  );
}

function ConfirmDialog({
  options,
  onClose,
}: {
  options: ConfirmOptions;
  onClose: (value: boolean) => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    restoreRef.current = document.activeElement;
    // التركيز يبدأ على «إلغاء» — الأمان قبل السرعة في الإجراءات المدمّرة
    cancelRef.current?.focus();

    return () => {
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, []);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose(false);
      return;
    }

    if (event.key === "Tab") {
      const first = cancelRef.current;
      const last = confirmRef.current;
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  const danger = options.tone === "danger";

  return (
    <div
      className="no-print fixed inset-0 z-[90] grid place-items-center p-4"
      onKeyDown={onKeyDown}
    >
      <div
        className="adm-fade absolute inset-0 bg-black/55"
        aria-hidden="true"
        onClick={() => onClose(false)}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="adm-confirm-title"
        aria-describedby={options.description ? "adm-confirm-desc" : undefined}
        className="adm-pop bg-surface relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{ borderColor: "var(--color-border)" }}
      >
        <h2 id="adm-confirm-title" className="text-lg font-bold">
          {options.title}
        </h2>

        {options.description ? (
          <div id="adm-confirm-desc" className="text-primary-600 mt-2 text-sm leading-relaxed">
            {options.description}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onClose(false)}
            className="border-border-strong text-primary-800 hover:bg-surface-muted min-h-10 rounded-lg border px-4 text-sm font-bold transition-colors"
          >
            {options.cancelLabel ?? "إلغاء"}
          </button>

          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            className={cn(
              "min-h-10 rounded-lg px-4 text-sm font-bold text-white transition-colors",
              danger
                ? "bg-danger-600 hover:bg-danger-700"
                : "bg-primary-950 hover:bg-primary-900",
            )}
          >
            {options.confirmLabel ?? "تأكيد"}
          </button>
        </div>
      </div>
    </div>
  );
}
