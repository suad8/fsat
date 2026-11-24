"use client";

import type { ComponentProps, ReactNode } from "react";

import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * حقول رحلة الشراء.
 *
 * مبنية فوق Field (العنوان + المساعدة + الخطأ) لكن بأبعاد الجوال:
 * ارتفاع ٤٨px، وخط ١٦px كي لا يكبّر iOS الصفحة عند التركيز، وخطأ يظهر
 * بجانب الحقل بعبارة بشرية.
 */

const CONTROL =
  "w-full rounded-xl border bg-surface px-4 text-base text-primary-900 transition-[border-color,box-shadow] " +
  "placeholder:text-primary-400 focus:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:border-accent-600 " +
  "disabled:bg-surface-sunken disabled:text-primary-400";

function tone(hasError: boolean) {
  return hasError
    ? "border-danger-500 bg-danger-50/40 focus-visible:ring-danger-500/30"
    : "border-border-strong hover:border-primary-400";
}

type Common = {
  id: string;
  label: string;
  error?: string | null;
  help?: ReactNode;
  optional?: boolean;
  wrapperClassName?: string;
  /** يظهر ✓ خضراء عند صحة القيمة بعد لمس الحقل. */
  valid?: boolean;
};

export function TextField({
  id,
  label,
  error,
  help,
  optional,
  wrapperClassName,
  valid,
  className,
  ...props
}: Common & Omit<ComponentProps<"input">, "id">) {
  return (
    <Field
      id={id}
      label={label}
      help={help}
      error={error}
      required={props.required}
      optional={optional}
      className={wrapperClassName}
    >
      <div className="relative">
        <input
          id={id}
          name={props.name ?? id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
          className={cn(CONTROL, "h-12", tone(Boolean(error)), valid && "pe-11", className)}
          {...props}
        />
        {valid && !error ? (
          <Icon
            name="check"
            strokeWidth={2.4}
            className="text-success-600 pointer-events-none absolute inset-y-0 end-3.5 my-auto size-4.5"
          />
        ) : null}
      </div>
    </Field>
  );
}

export function AreaField({
  id,
  label,
  error,
  help,
  optional,
  wrapperClassName,
  className,
  rows = 3,
  ...props
}: Common & Omit<ComponentProps<"textarea">, "id">) {
  return (
    <Field
      id={id}
      label={label}
      help={help}
      error={error}
      required={props.required}
      optional={optional}
      className={wrapperClassName}
    >
      <textarea
        id={id}
        name={props.name ?? id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        className={cn(CONTROL, "resize-y py-3 leading-relaxed", tone(Boolean(error)), className)}
        {...props}
      />
    </Field>
  );
}

export function SelectField({
  id,
  label,
  error,
  help,
  optional,
  wrapperClassName,
  className,
  children,
  ...props
}: Common & Omit<ComponentProps<"select">, "id">) {
  return (
    <Field
      id={id}
      label={label}
      help={help}
      error={error}
      required={props.required}
      optional={optional}
      className={wrapperClassName}
    >
      <div className="relative">
        <select
          id={id}
          name={props.name ?? id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
          className={cn(CONTROL, "h-12 appearance-none pe-11", tone(Boolean(error)), className)}
          {...props}
        >
          {children}
        </select>
        <Icon
          name="chevronDown"
          className="text-primary-400 pointer-events-none absolute inset-y-0 end-4 my-auto size-4"
        />
      </div>
    </Field>
  );
}
