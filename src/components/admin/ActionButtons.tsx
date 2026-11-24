"use client";

import { useState, type ReactNode } from "react";

import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcon";
import { useToast } from "@/components/admin/Feedback";
import { cn } from "@/lib/utils";

/** نسخ نص إلى الحافظة مع تأكيد مرئي ومسموع. */
export function CopyButton({
  text,
  label,
  toastText,
  className,
  children,
}: {
  text: string;
  /** وصف للقارئ الشاشي: «نسخ رقم الطلب». */
  label: string;
  toastText?: string;
  className?: string;
  children?: ReactNode;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // المتصفح قد يمنع الحافظة خارج HTTPS — نلجأ لتحديد نص مؤقت
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();

      if (!ok) {
        toast.error("تعذّر النسخ", "انسخ النص يدويًا.");
        return;
      }
    }

    setCopied(true);
    toast.success(toastText ?? "تم النسخ");
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className={cn(
        "text-primary-600 hover:bg-surface-sunken hover:text-primary-950 inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-bold transition-colors",
        className,
      )}
    >
      <AdminIcon name={copied ? "check" : "copy"} className="size-4" strokeWidth={copied ? 2.2 : 1.6} />
      {children}
    </button>
  );
}

/** يفتح حوار الطباعة. يُخفى هو نفسه عند الطباعة. */
export function PrintButton({
  children = "طباعة",
  icon = "printer",
  className,
}: {
  children?: ReactNode;
  icon?: AdminIconName;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        "no-print bg-primary-950 hover:bg-primary-900 inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white shadow-sm transition-colors",
        className,
      )}
    >
      <AdminIcon name={icon} className="size-4" />
      {children}
    </button>
  );
}
