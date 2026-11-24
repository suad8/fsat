import type { ReactNode } from "react";

import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

type Tone = "default" | "muted";

/**
 * قسم الصفحات التعريفية — إيقاع موحّد: عنوان ← محتوى.
 *
 * كل صفحة تعريفية تبني أقسامها بهذا المكوّن فتتطابق المسافات ومقاسات العناوين
 * وتدرّج الخلفيات بين الصفحات. الدعوة الختامية في ClosingCta.
 */
export function PageSection({
  id,
  tone = "default",
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  bordered = false,
  headingId,
}: {
  id?: string;
  tone?: Tone;
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  /** رابط ثانوي بمحاذاة العنوان (مثل «كل المعدات»). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bordered?: boolean;
  headingId?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn(
        "py-14 md:py-20",
        tone === "muted" ? "bg-surface-muted" : "bg-surface",
        bordered && "border-border border-t",
        className,
      )}
    >
      <div className="container-page">
        {title ? (
          <SectionHead
            id={headingId}
            eyebrow={eyebrow}
            title={title}
            description={description}
            action={action}
          />
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function SectionHead({
  id,
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-9 md:mb-12", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="text-accent-700 mb-3 flex items-center gap-3 text-sm font-bold">
              <span aria-hidden="true" className="bg-accent-500 h-0.5 w-7 rounded-full" />
              {eyebrow}
            </p>
          ) : null}
          <h2
            id={id}
            className="text-[clamp(1.65rem,3.4vw,2.6rem)] leading-[1.2] font-black"
          >
            {title}
          </h2>
          {description ? (
            <p className="text-primary-600 mt-3.5 text-base leading-relaxed md:text-lg">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </Reveal>
  );
}
