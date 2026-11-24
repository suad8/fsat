"use client";

import { useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ShopIcon } from "@/components/shop/ShopIcon";
import { cn } from "@/lib/utils";

/**
 * زر نسخ إلى الحافظة مع تأكيد مقروء. يرجع إلى تحديد النص إن لم يتوفر
 * navigator.clipboard (بعض المتصفحات القديمة/السياقات غير الآمنة).
 */
export function CopyButton({
  value,
  label = "نسخ",
  doneLabel = "تم النسخ",
  className,
}: {
  value: string;
  label?: string;
  doneLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      area.remove();
    }

    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2200);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "border-border-strong text-primary-800 hover:border-accent-600 hover:bg-surface-muted focus-visible:outline-accent-600 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-surface px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        copied && "border-success-500 text-success-700 bg-success-50",
        className,
      )}
    >
      {copied ? (
        <Icon name="check" className="size-4" strokeWidth={2.4} />
      ) : (
        <ShopIcon name="copy" className="size-4" />
      )}
      <span aria-live="polite">{copied ? doneLabel : label}</span>
    </button>
  );
}
