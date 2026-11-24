"use client";

import type { ReactNode } from "react";

import { ShopIcon, type ShopIconName } from "@/components/shop/ShopIcon";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * بطاقة اختيار (راديو) لطريقة الاستلام والدفع.
 * الإدخال الأصلي مخفي بصريًا لكنه يبقى في شجرة إمكانية الوصول؛ الحالة
 * المعطّلة «قريبًا» تبقى مرئية كي يعرف العميل أن الخيار قادم لا مفقود.
 */
export function ChoiceCard({
  id,
  name,
  value,
  checked,
  onChange,
  icon,
  shopIcon,
  title,
  description,
  badge,
  disabled,
  children,
}: {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  icon?: IconName;
  shopIcon?: ShopIconName;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "group relative flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition-[border-color,background-color,box-shadow] duration-200 md:p-5",
        "has-focus-visible:outline-accent-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
        disabled
          ? "border-border bg-surface-muted cursor-not-allowed opacity-70"
          : checked
            ? "border-accent-600 bg-accent-50/50 shadow-card ring-accent-600/25 ring-1"
            : "border-border-strong bg-surface hover:border-primary-400 hover:shadow-card",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />

      <span
        aria-hidden="true"
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl transition-colors",
          checked && !disabled ? "bg-accent-500 text-accent-contrast" : "bg-surface-sunken text-primary-700",
        )}
      >
        {shopIcon ? (
          <ShopIcon name={shopIcon} className="size-5" />
        ) : icon ? (
          <Icon name={icon} className="size-5" />
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-primary-950 text-[0.95rem] font-bold">{title}</span>
          {badge}
        </span>
        {description ? (
          <span className="text-primary-600 mt-1 block text-[0.8rem] leading-relaxed">
            {description}
          </span>
        ) : null}
        {children}
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "mt-1 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
          checked && !disabled ? "border-accent-600" : "border-border-strong",
        )}
      >
        <span
          className={cn(
            "bg-accent-600 size-2.5 rounded-full transition-transform",
            checked && !disabled ? "scale-100" : "scale-0",
          )}
        />
      </span>
    </label>
  );
}
