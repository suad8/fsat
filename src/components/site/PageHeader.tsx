import type { ReactNode } from "react";

import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { cn } from "@/lib/utils";

/**
 * ترويسة الصفحات الداخلية.
 *
 * موحّدة عبر كل الصفحات ليعرف الزائر موقعه من الموقع فورًا، وتحمل مسار
 * التنقّل الذي تُبنى منه بيانات BreadcrumbList المنظّمة أيضًا.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  action,
  tone = "dark",
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  action?: ReactNode;
  tone?: "dark" | "light";
  children?: ReactNode;
}) {
  const isDark = tone === "dark";

  return (
    <section
      className={cn(
        "relative overflow-hidden",
        isDark ? "bg-primary-950 text-white" : "bg-surface-muted border-border border-b",
      )}
    >
      {isDark ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(255 255 255) 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />
      ) : null}

      <div className="container-page relative py-9 md:py-14">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumbs
            items={breadcrumbs}
            tone={isDark ? "dark" : "light"}
            className="mb-6"
          />
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p
                className={cn(
                  "mb-3 text-xs font-bold tracking-[0.18em]",
                  isDark ? "text-accent-300" : "text-accent-700",
                )}
              >
                {eyebrow}
              </p>
            ) : null}

            <h1
              className={cn(
                "text-2xl md:text-3xl lg:text-[2.35rem]",
                isDark && "text-white",
              )}
            >
              {title}
            </h1>

            {description ? (
              <div
                className={cn(
                  "mt-4 text-base leading-relaxed",
                  isDark ? "text-primary-300" : "text-primary-600",
                )}
              >
                {description}
              </div>
            ) : null}
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        {children}
      </div>
    </section>
  );
}
