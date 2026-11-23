import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionProps = {
  children: ReactNode;
  id?: string;
  className?: string;
  /** خلفية القسم — تُستخدم للتناوب بين الأقسام وإعطاء إيقاع بصري. */
  tone?: "default" | "muted" | "sunken" | "dark";
  /** إلغاء التباعد الرأسي الافتراضي. */
  flush?: boolean;
};

const TONES = {
  default: "bg-surface",
  muted: "bg-surface-muted",
  sunken: "bg-surface-sunken",
  dark: "bg-primary-950 text-primary-100",
} as const;

export function Section({
  children,
  id,
  className,
  tone = "default",
  flush = false,
}: SectionProps) {
  return (
    <section id={id} className={cn(TONES[tone], !flush && "section-y", className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

type SectionHeadingProps = {
  /** نص صغير فوق العنوان يعرّف بالقسم. */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** محاذاة المحتوى — الوسط للأقسام التعريفية، البداية للقوائم. */
  align?: "start" | "center";
  /** عنصر يظهر بمحاذاة العنوان (زر "عرض الكل" مثلاً). */
  action?: ReactNode;
  tone?: "light" | "dark";
  /** مستوى العنوان — h2 افتراضيًا للحفاظ على تسلسل صحيح داخل الصفحة. */
  as?: "h1" | "h2" | "h3";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  action,
  tone = "light",
  as: Tag = "h2",
  className,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "mb-10 md:mb-14",
        centered ? "text-center" : "flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div className={cn(centered && "mx-auto max-w-3xl")}>
        {eyebrow ? (
          <p
            className={cn(
              "mb-4 inline-flex items-center gap-3 text-xs font-bold tracking-[0.2em]",
              tone === "dark" ? "text-accent-300" : "text-accent-700",
            )}
          >
            <span aria-hidden="true" className="h-px w-8 bg-current opacity-60" />
            {eyebrow}
            {centered ? (
              <span aria-hidden="true" className="h-px w-8 bg-current opacity-60" />
            ) : null}
          </p>
        ) : null}

        <Tag
          className={cn(
            "text-[clamp(2rem,5vw,3.9rem)] leading-[1.08] font-black tracking-[-0.015em]",
            tone === "dark" && "text-white",
          )}
        >
          {title}
        </Tag>

        {description ? (
          <p
            className={cn(
              "mt-5 text-base leading-relaxed md:text-lg",
              tone === "dark" ? "text-primary-300" : "text-primary-600",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className={cn(centered && "mt-6")}>{action}</div> : null}
    </div>
  );
}
