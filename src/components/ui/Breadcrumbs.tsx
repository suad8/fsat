import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  href?: string;
};

/**
 * مسار التنقّل.
 *
 * يُعرض بصريًا للزائر، وتُولَّد له بيانات BreadcrumbList المنظّمة بشكل منفصل
 * في src/lib/seo.ts لتظهر في نتائج البحث.
 */
export function Breadcrumbs({
  items,
  className,
  tone = "light",
}: {
  items: Crumb[];
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <nav aria-label="مسار التنقّل" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        <li className="flex items-center gap-1.5">
          <Link
            href="/"
            className={cn(
              "transition-colors",
              tone === "dark"
                ? "text-primary-300 hover:text-white"
                : "text-primary-500 hover:text-primary-900",
            )}
          >
            الرئيسية
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              <Icon
                name="chevronLeft"
                className={cn(
                  "size-3.5 shrink-0",
                  tone === "dark" ? "text-primary-600" : "text-primary-300",
                )}
                strokeWidth={2}
              />

              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    "truncate transition-colors",
                    tone === "dark"
                      ? "text-primary-300 hover:text-white"
                      : "text-primary-500 hover:text-primary-900",
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "truncate font-bold",
                    tone === "dark" ? "text-white" : "text-primary-900",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
