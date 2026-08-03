"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { IconButton } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * نافذة منبثقة مبنية على عنصر <dialog> الأصلي.
 *
 * استخدام العنصر الأصلي يعطينا مجانًا: حصر التركيز داخل النافذة، الإغلاق
 * بمفتاح Escape، وطبقة inert على بقية الصفحة — وهي أمور يصعب تنفيذها
 * يدويًا بشكل صحيح.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // منع تمرير الصفحة خلف النافذة
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const sizes = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    full: "max-w-6xl",
  } as const;

  return (
    <dialog
      ref={ref}
      dir="rtl"
      aria-labelledby="modal-title"
      onClose={onClose}
      onCancel={onClose}
      // الإغلاق بالنقر على الخلفية: نتحقق أن النقر وقع على العنصر نفسه لا على محتواه
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "bg-surface m-auto w-[calc(100%-1.5rem)] rounded-xl p-0 shadow-pop backdrop:bg-primary-950/60 backdrop:backdrop-blur-sm",
        "animate-scale-in open:flex open:flex-col",
        "max-h-[calc(100dvh-2rem)]",
        sizes[size],
        className,
      )}
    >
      <header className="border-border bg-surface sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-5 py-4">
        <h2 id="modal-title" className="truncate text-lg font-bold">
          {title}
        </h2>
        <IconButton name="close" label="إغلاق النافذة" size="sm" onClick={onClose} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}
