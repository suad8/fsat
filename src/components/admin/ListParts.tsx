import Link from "next/link";
import { Children, type ReactNode } from "react";

import { AdminIcon } from "@/components/admin/AdminIcon";
import { hrefWith, type ParamBag } from "@/lib/admin/url";
import { cn, formatNumber } from "@/lib/utils";

/** رقاقة فلتر حالة: رابط، فيعمل بلا JavaScript ويُحفظ في الرابط. */
export function FilterChip({
  href,
  active,
  count,
  tone,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  /** attention = رقاقة تحتاج إجراءً (حدّ ذهبي حتى لو لم تكن نشطة). */
  tone?: "attention";
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold whitespace-nowrap transition-colors",
        active
          ? "bg-primary-950 text-white"
          : "bg-surface text-primary-700 border-border hover:bg-surface-sunken border",
        !active && tone === "attention" && "border-accent-600 text-primary-950",
      )}
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            "rounded-full px-1.5 text-[0.68rem] tabular-nums",
            active ? "bg-white/20" : "bg-surface-sunken text-primary-600",
          )}
        >
          {formatNumber(count)}
        </span>
      ) : null}
    </Link>
  );
}

export function FilterChips({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <nav aria-label={label} className="min-w-0">
      <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {Children.toArray(children).map((child, index) => (
          <li key={index}>{child}</li>
        ))}
      </ul>
    </nav>
  );
}

/** ترقيم صفحات بروابط. يخفي نفسه إذا كانت صفحة واحدة. */
export function Pagination({
  base,
  params,
  page,
  pageSize,
  total,
}: {
  base: string;
  params: ParamBag;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const link = (target: number) =>
    hrefWith(base, params, { page: target > 1 ? String(target) : undefined }, { resetPage: false });

  return (
    <nav
      aria-label="التنقّل بين الصفحات"
      className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs"
    >
      <p className="text-primary-600">
        {formatNumber(from)}–{formatNumber(to)} من {formatNumber(total)}
      </p>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={link(page - 1)}
            rel="prev"
            className="border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 font-bold"
          >
            <AdminIcon name="chevronRight" className="size-3.5" strokeWidth={2.2} />
            السابق
          </Link>
        ) : null}

        <span className="text-primary-600 px-1 tabular-nums">
          {formatNumber(page)} / {formatNumber(pages)}
        </span>

        {page < pages ? (
          <Link
            href={link(page + 1)}
            rel="next"
            className="border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 font-bold"
          >
            التالي
            <AdminIcon name="chevronLeft" className="size-3.5" strokeWidth={2.2} />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
