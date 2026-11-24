import Link from "next/link";
import type { ReactNode } from "react";

import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcon";
import { cn } from "@/lib/utils";

/**
 * لبنات واجهة لوحة التحكم.
 *
 * الاتجاه البصري: أهدأ من الموقع العام وأكثر كثافة — أسطح بيضاء بحدود رفيعة
 * على خلفية بنفسجية باهتة، وحبر داكن (--color-ink) للشريط الجانبي فقط، والذهبي
 * لنقطة التركيز الوحيدة في كل شاشة (الإجراء التالي).
 */

/** ترويسة صفحة داخل لوحة التحكم. */
export function AdminHeading({
  title,
  description,
  action,
  backHref,
  backLabel,
  meta,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
  /** شارات بجانب العنوان (حالة، رقم…) */
  meta?: ReactNode;
}) {
  return (
    <div className="mb-5 md:mb-7" data-adm-in>
      {backHref ? (
        <Link
          href={backHref}
          className="text-primary-500 hover:text-primary-900 -ms-1 mb-2.5 inline-flex min-h-8 items-center gap-1 rounded-md px-1 text-sm transition-colors"
        >
          <AdminIcon name="chevronRight" className="size-4" strokeWidth={2} />
          {backLabel ?? "رجوع"}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-xl font-extrabold md:text-2xl">{title}</h1>
            {meta}
          </div>
          {description ? (
            <p className="text-primary-600 mt-1.5 max-w-3xl text-sm leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
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
  id,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("border-border bg-surface rounded-xl border shadow-sm", className)}
    >
      {title ? (
        <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-[0.95rem] font-bold">{title}</h2>
            {description ? (
              <p className="text-primary-500 mt-0.5 text-xs leading-relaxed">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}

      <div className={padded ? "p-4 sm:p-5" : undefined}>{children}</div>
    </section>
  );
}

/** بطاقة إحصائية. */
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
  icon: AdminIconName;
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
        <span className="text-primary-600 text-sm">{label}</span>
        <span
          aria-hidden="true"
          className={cn("grid size-9 shrink-0 place-items-center rounded-lg", tones[tone])}
        >
          <AdminIcon name={icon} className="size-[1.1rem]" />
        </span>
      </div>

      <p className="font-display text-primary-950 mt-3 text-2xl font-extrabold tabular-nums">
        {value}
      </p>

      {hint ? <p className="text-primary-500 mt-1 text-xs">{hint}</p> : null}
    </>
  );

  const className =
    "border-border bg-surface block rounded-xl border p-4 shadow-sm transition-[border-color,box-shadow] sm:p-5";

  if (href) {
    return (
      <Link href={href} className={cn(className, "hover:border-border-strong hover:shadow-card")}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

/** شارة حالة عامة (أصناف Tailwind جاهزة). للحالات المعروفة استعمل StatusBadges. */
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
  icon?: AdminIconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center sm:py-14">
      <span className="bg-surface-sunken text-primary-500 mb-4 grid size-12 place-items-center rounded-full">
        <AdminIcon name={icon} className="size-6" strokeWidth={1.4} />
      </span>

      <p className="font-bold">{title}</p>

      {description ? (
        <p className="text-primary-600 mt-1.5 max-w-sm text-sm leading-relaxed">{description}</p>
      ) : null}

      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * جدول متجاوب.
 *
 * الجداول العريضة تُمرَّر أفقيًا داخل حاويتها بدل أن تدفع الصفحة كلها
 * للتمرير. القوائم الرئيسية (طلبات، عروض) تعرض بطاقات على الجوال بدل الجدول.
 */
export function AdminTable({
  head,
  children,
  caption,
  className,
}: {
  head: ReactNode;
  children: ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <div className="adm-scroll-x overflow-x-auto" tabIndex={0} role="region" aria-label={caption}>
      <table className={cn("w-full min-w-[40rem] text-sm", className)}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-surface-sunken">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-border divide-y">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "text-primary-600 px-4 py-2.5 text-start text-xs font-bold whitespace-nowrap",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

/** زوج تسمية/قيمة في قوائم التفاصيل. */
export function Detail({
  label,
  children,
  ltr,
  className,
}: {
  label: string;
  children: ReactNode;
  ltr?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-primary-500 text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words" dir={ltr ? "ltr" : undefined}>
        <span className={ltr ? "inline-block text-right" : undefined}>{children}</span>
      </dd>
    </div>
  );
}
