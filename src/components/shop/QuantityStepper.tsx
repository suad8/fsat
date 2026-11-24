"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { normalizeQuantity } from "@/lib/pricing";
import { digitsOnly } from "@/lib/shop/phone";
import { cn } from "@/lib/utils";

/**
 * عدّاد الكمية: أزرار ≥٤٤px، حقل رقمي بلوحة أرقام، ويقبل الأرقام العربية.
 * الكمية تُثبَّت على الحد الأدنى وخطوة المنتج (٥٠٠ كوب مثلًا لا ٥٠١).
 */
export function QuantityStepper({
  id,
  value,
  min,
  step,
  onChange,
  label,
  size = "md",
  className,
  describedBy,
}: {
  id: string;
  value: number;
  min: number;
  step: number;
  onChange: (next: number) => void;
  /** اسم يُقرأ لقارئ الشاشة: «كمية كوب ورقي». */
  label: string;
  size?: "md" | "lg";
  className?: string;
  describedBy?: string;
}) {
  // نص الحقل أثناء الكتابة؛ يعود لقيمة الأب بعد التثبيت
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);

  function commit(raw: string) {
    const parsed = Number.parseInt(digitsOnly(raw), 10);
    const next = normalizeQuantity(
      { minQuantity: min, quantityStep: step },
      Number.isNaN(parsed) ? min : parsed,
    );
    setDraft(null);
    if (next !== value) onChange(next);
  }

  function bump(direction: 1 | -1) {
    const next = normalizeQuantity({ minQuantity: min, quantityStep: step }, value + direction * step);
    setDraft(null);
    if (next !== value) onChange(next);
  }

  const box = size === "lg" ? "h-13" : "h-11";
  const btn = cn(
    "text-primary-700 hover:bg-surface-sunken hover:text-primary-950 focus-visible:outline-accent-600 grid shrink-0 place-items-center transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:cursor-not-allowed disabled:opacity-35",
    size === "lg" ? "size-13" : "size-11",
  );

  return (
    <div
      className={cn(
        "border-border-strong bg-surface inline-flex items-center overflow-hidden rounded-xl border",
        box,
        className,
      )}
    >
      <button
        type="button"
        onClick={() => bump(-1)}
        disabled={value <= min}
        aria-label={`إنقاص ${label}`}
        className={btn}
      >
        <Icon name="minus" className="size-4" strokeWidth={2.4} />
      </button>

      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        value={shown}
        aria-label={label}
        aria-describedby={describedBy}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit((event.target as HTMLInputElement).value);
          }
        }}
        className="text-primary-950 h-full w-20 min-w-0 border-0 bg-transparent text-center text-base font-bold tabular-nums focus:outline-none sm:w-24"
      />

      <button
        type="button"
        onClick={() => bump(1)}
        aria-label={`زيادة ${label}`}
        className={btn}
      >
        <Icon name="plus" className="size-4" strokeWidth={2.4} />
      </button>
    </div>
  );
}
