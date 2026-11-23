import type { ReactNode } from "react";

import { Intro } from "@/components/ui/Intro";
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
        isDark ? "bg-ink grain text-white" : "bg-surface-muted border-border border-b",
      )}
    >
      {isDark ? (
        <>
          <div
            aria-hidden="true"
            className="halftone halftone-fade text-white/[0.07] pointer-events-none absolute inset-0"
          />
          <div
            aria-hidden="true"
            className="bg-accent-500/20 pointer-events-none absolute -top-24 -end-24 size-96 rounded-full blur-[120px]"
          />
          {eyebrow ? (
            <p
              aria-hidden="true"
              className="font-display text-outline pointer-events-none absolute -bottom-[0.28em] start-0 text-[clamp(6rem,22vw,20rem)] leading-none font-black whitespace-nowrap text-white/[0.14] select-none"
            >
              {eyebrow}
            </p>
          ) : null}
          <div
            aria-hidden="true"
            className="bg-brand-600/25 pointer-events-none absolute -bottom-32 start-1/4 size-80 rounded-full blur-[120px]"
          />
        </>
      ) : null}

      <div className="container-page relative py-12 md:py-20">
        <Intro>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumbs
            items={breadcrumbs}
            tone={isDark ? "dark" : "light"}
            className="mb-6"
          />
        ) : null}

        <div data-intro className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-4xl">
            {eyebrow ? (
              <p
                className={cn(
                  "mb-4 text-xs font-bold tracking-[0.2em]",
                  isDark ? "text-accent-300" : "text-accent-700",
                )}
              >
                {eyebrow}
              </p>
            ) : null}

            <h1
              className={cn(
                "text-[clamp(2.4rem,7vw,5.5rem)] leading-[1.05] font-black tracking-[-0.02em]",
                isDark && "text-white",
              )}
            >
              {title}
            </h1>

            {description ? (
              <div
                className={cn(
                  "mt-6 max-w-2xl text-base leading-relaxed md:text-lg",
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
        </Intro>
      </div>
    </section>
  );
}
