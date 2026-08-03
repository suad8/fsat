import type { ComponentProps, ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * حقول النماذج.
 *
 * كل حقل مربوط بعنوانه عبر htmlFor/id، وبنص المساعدة ورسالة الخطأ عبر
 * aria-describedby، وبحالة الخطأ عبر aria-invalid — فيقرأ قارئ الشاشة
 * الحقل كاملاً بسياقه بدل قراءة اسمه وحده.
 */

const CONTROL_BASE =
  "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-primary-900 " +
  "transition-colors placeholder:text-primary-400 " +
  "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 " +
  "disabled:bg-surface-sunken disabled:text-primary-400 disabled:cursor-not-allowed";

const CONTROL_TONE = {
  normal: "border-border-strong focus-visible:outline-accent-600 hover:border-primary-400",
  error: "border-danger-500 bg-danger-50/40 focus-visible:outline-danger-600",
} as const;

function controlClasses(hasError: boolean, className?: string) {
  return cn(CONTROL_BASE, hasError ? CONTROL_TONE.error : CONTROL_TONE.normal, className);
}

type FieldProps = {
  id: string;
  label: string;
  children: ReactNode;
  help?: ReactNode;
  error?: string | null;
  required?: boolean;
  /** يُظهر كلمة "اختياري" بجانب العنوان. */
  optional?: boolean;
  className?: string;
};

export function Field({
  id,
  label,
  children,
  help,
  error,
  required,
  optional,
  className,
}: FieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="text-primary-800 mb-1.5 block text-sm font-bold">
        {label}
        {required ? (
          <span className="text-danger-600 ms-1" aria-hidden="true">
            *
          </span>
        ) : null}
        {optional ? (
          <span className="text-primary-400 ms-1.5 text-xs font-medium">(اختياري)</span>
        ) : null}
      </label>

      {children}

      {help && !error ? (
        <p id={`${id}-help`} className="text-primary-500 mt-1.5 text-xs leading-relaxed">
          {help}
        </p>
      ) : null}

      {error ? (
        <p
          id={`${id}-error`}
          className="text-danger-600 mt-1.5 flex items-center gap-1.5 text-xs font-bold"
        >
          <Icon name="alert" className="size-3.5" strokeWidth={2} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** يبني قيمة aria-describedby من نص المساعدة ورسالة الخطأ. */
function describedBy(id: string, help?: ReactNode, error?: string | null) {
  const ids: string[] = [];
  if (error) ids.push(`${id}-error`);
  else if (help) ids.push(`${id}-help`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

type ControlOwnProps = {
  id: string;
  label: string;
  help?: ReactNode;
  error?: string | null;
  optional?: boolean;
  wrapperClassName?: string;
};

export function TextInput({
  id,
  label,
  help,
  error,
  optional,
  wrapperClassName,
  className,
  ...props
}: ControlOwnProps & Omit<ComponentProps<"input">, "id">) {
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
      <input
        id={id}
        name={props.name ?? id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        className={controlClasses(Boolean(error), className)}
        {...props}
      />
    </Field>
  );
}

export function TextArea({
  id,
  label,
  help,
  error,
  optional,
  wrapperClassName,
  className,
  rows = 4,
  ...props
}: ControlOwnProps & Omit<ComponentProps<"textarea">, "id">) {
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
        aria-describedby={describedBy(id, help, error)}
        className={controlClasses(Boolean(error), cn("resize-y", className))}
        {...props}
      />
    </Field>
  );
}

export function Select({
  id,
  label,
  help,
  error,
  optional,
  wrapperClassName,
  className,
  children,
  ...props
}: ControlOwnProps & Omit<ComponentProps<"select">, "id">) {
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
          aria-describedby={describedBy(id, help, error)}
          className={controlClasses(
            Boolean(error),
            cn("appearance-none ps-3.5 pe-10", className),
          )}
          {...props}
        >
          {children}
        </select>
        <Icon
          name="chevronDown"
          className="text-primary-400 pointer-events-none absolute inset-y-0 left-3 my-auto size-4"
        />
      </div>
    </Field>
  );
}

/** مربّع اختيار مع نص وصفي — يُستخدم للموافقة على الشروط وللخيارات المتعددة. */
export function Checkbox({
  id,
  label,
  description,
  error,
  className,
  ...props
}: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: string | null;
} & Omit<ComponentProps<"input">, "id" | "type">) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          name={props.name ?? id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "text-accent-600 focus-visible:outline-accent-600 mt-0.5 size-[1.15rem] shrink-0 cursor-pointer rounded border-2 focus-visible:outline-2 focus-visible:outline-offset-2",
            error ? "border-danger-500" : "border-border-strong",
          )}
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed">
          <span className="text-primary-800 font-medium">{label}</span>
          {description ? (
            <span className="text-primary-500 mt-0.5 block text-xs">{description}</span>
          ) : null}
        </label>
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          className="text-danger-600 mt-1.5 flex items-center gap-1.5 text-xs font-bold"
        >
          <Icon name="alert" className="size-3.5" strokeWidth={2} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * بطاقة اختيار — بديل بصري لأزرار الراديو، تُستخدم لطرق الدفع والاستلام.
 * الإدخال الأصلي مخفي بصريًا لكنه يبقى في شجرة إمكانية الوصول.
 */
export function OptionCard({
  id,
  name,
  value,
  title,
  description,
  checked,
  defaultChecked,
  onChange,
  disabled,
  type = "radio",
}: {
  id: string;
  name: string;
  value: string;
  title: ReactNode;
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: ComponentProps<"input">["onChange"];
  disabled?: boolean;
  type?: "radio" | "checkbox";
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all",
        "border-border-strong hover:border-primary-400 hover:bg-surface-muted",
        "has-checked:border-accent-600 has-checked:bg-accent-50/60 has-checked:ring-accent-600/20 has-checked:ring-1",
        "has-focus-visible:outline-accent-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input
        id={id}
        name={name}
        value={value}
        type={type}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />

      <span
        aria-hidden="true"
        className={cn(
          "border-border-strong group-has-checked:border-accent-600 mt-0.5 grid size-5 shrink-0 place-items-center border-2 transition-colors",
          type === "radio" ? "rounded-full" : "rounded",
        )}
      >
        <span
          className={cn(
            "bg-accent-600 size-2.5 scale-0 transition-transform group-has-checked:scale-100",
            type === "radio" ? "rounded-full" : "rounded-xs",
          )}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="text-primary-900 block text-sm font-bold">{title}</span>
        {description ? (
          <span className="text-primary-500 mt-1 block text-xs leading-relaxed">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
