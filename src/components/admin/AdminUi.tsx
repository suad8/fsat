import Link from "next/link";
import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/** ترويسة صفحة داخل لوحة التحكم. */
export function AdminHeading({
  title,
  description,
  action,
  backHref,
  backLabel,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-6 md:mb-8">
      {backHref ? (
        <Link
          href={backHref}
          className="text-primary-500 hover:text-primary-900 mb-3 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <Icon name="chevronRight" className="size-4" strokeWidth={2} />
          {backLabel ?? "رجوع"}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
          {description ? (
            <p className="text-primary-600 mt-1.5 text-sm leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

/** بطاقة محتوى. */
export function AdminCard({
  title,
  description,
  action,
  children,
  className,
  padded = true,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn("border-border bg-surface rounded-xl border shadow-sm", className)}
    >
      {title ? (
        <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold">{title}</h2>
            {description ? (
              <p className="text-primary-500 mt-0.5 text-xs">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}

      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

/** بطاقة إحصائية للوحة المعلومات. */
export function StatCard({
  label,
  value,
  icon,
  href,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string | number;
  icon: IconName;
  href?: string;
  tone?: "neutral" | "accent" | "success" | "warning";
  hint?: string;
}) {
  const tones = {
    neutral: "bg-primary-100 text-primary-700",
    accent: "bg-accent-50 text-accent-700",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
  } as const;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-primary-500 text-sm">{label}</span>
        <span
          aria-hidden="true"
          className={cn("grid size-9 shrink-0 place-items-center rounded-lg", tones[tone])}
        >
          <Icon name={icon} className="size-4.5" />
        </span>
      </div>

      <p className="font-display text-primary-950 mt-3 text-2xl font-extrabold tabular-nums">
        {value}
      </p>

      {hint ? <p className="text-primary-500 mt-1 text-xs">{hint}</p> : null}
    </>
  );

  const className =
    "border-border bg-surface block rounded-xl border p-5 shadow-sm transition-[border-color,box-shadow]";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(className, "hover:border-border-strong hover:shadow-card")}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

/** شارة حالة. */
export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  /** أصناف Tailwind جاهزة من ORDER_STATUS_TONE أو ما شابهها. */
  tone: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset whitespace-nowrap",
        tone,
      )}
    >
      {label}
    </span>
  );
}

/** حالة فارغة داخل جدول أو بطاقة. */
export function AdminEmpty({
  icon = "package",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="bg-surface-sunken text-primary-400 mb-4 grid size-12 place-items-center rounded-full">
        <Icon name={icon} className="size-6" strokeWidth={1.4} />
      </span>

      <p className="font-bold">{title}</p>

      {description ? (
        <p className="text-primary-500 mt-1.5 max-w-sm text-sm leading-relaxed">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * جدول متجاوب.
 *
 * الجداول العريضة تُمرَّر أفقيًا داخل حاويتها بدل أن تدفع الصفحة كلها
 * للتمرير — وهو ما يجعل اللوحة قابلة للاستخدام على الجوال فعلاً.
 */
export function AdminTable({
  head,
  children,
  caption,
}: {
  head: ReactNode;
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-surface-sunken">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-border divide-y">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "text-primary-600 px-4 py-3 text-right text-xs font-bold whitespace-nowrap",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}
