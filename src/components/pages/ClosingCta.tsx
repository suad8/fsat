import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/Button";
import type { IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

type Action = {
  label: string;
  href: string;
  icon?: IconName;
  external?: boolean;
};

/**
 * الدعوة الختامية الواحدة في أسفل كل صفحة تعريفية.
 *
 * بطاقة حبرية عائمة داخل قسم فاتح، فلا تلتصق بالفوتر الداكن وتبقى الدعوة
 * مركز الانتباه الأخير. دعوة رئيسية واحدة، وثانوية اختيارية (واتساب).
 */
export function ClosingCta({
  title,
  description,
  primary,
  secondary,
  note,
}: {
  title: string;
  description?: ReactNode;
  primary: Action;
  secondary?: Action;
  note?: ReactNode;
}) {
  return (
    <section className="bg-surface-muted border-border border-t py-14 md:py-20">
      <div className="container-page">
        <Reveal>
          <div className="bg-ink grain shadow-pop relative overflow-hidden rounded-[2rem] px-6 py-12 text-center md:px-16 md:py-16">
            <div
              aria-hidden="true"
              className="halftone halftone-fade pointer-events-none absolute inset-0 text-white/[0.06]"
            />
            <div
              aria-hidden="true"
              className="bg-accent-500/25 pointer-events-none absolute -top-28 start-1/2 size-80 rounded-full blur-[110px]"
            />

            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-[clamp(1.7rem,3.6vw,2.7rem)] leading-[1.2] font-black text-white">
                {title}
              </h2>

              {description ? (
                <p className="text-primary-300 mt-4 text-base leading-relaxed md:text-lg">
                  {description}
                </p>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <ButtonLink
                  href={primary.href}
                  size="lg"
                  variant="accent"
                  icon={primary.icon}
                  external={primary.external}
                >
                  {primary.label}
                </ButtonLink>

                {secondary ? (
                  <ButtonLink
                    href={secondary.href}
                    size="lg"
                    variant="outline"
                    icon={secondary.icon}
                    external={secondary.external}
                    className="border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 hover:text-white"
                  >
                    {secondary.label}
                  </ButtonLink>
                ) : null}
              </div>

              {note ? <p className="text-primary-400 mt-5 text-sm">{note}</p> : null}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
