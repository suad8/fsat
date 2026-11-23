"use client";

import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { Icon, resolveIcon } from "@/components/ui/Icon";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type Category = { slug: string; name: string; iconKey: string | null; count: number };

/** ألوان اللوحات بالتناوب؛ كل لوحة تحمل لون نصها المتباين. */
const PANELS = [
  "bg-brand-600 text-white",
  "bg-accent-500 text-accent-contrast",
  "bg-ink text-white",
  "bg-magenta text-white",
  "bg-primary-800 text-white",
];

/**
 * «ماذا نطبع» — شريط أقسام أفقي.
 *
 * على الشاشات الكبيرة يُثبَّت القسم ويتحرك المحتوى أفقيًا مع التمرير
 * العمودي (ScrollTrigger pin + scrub). على الجوال يبقى شريطًا أفقيًا
 * عاديًا قابلًا للسحب مع محاذاة snap. المسار dir=ltr والعناصر معكوسة الترتيب
 * ليظهر القسم الأول عند اليمين كما يقرأ العربي.
 */
export function CategoriesRail({ categories }: { categories: Category[] }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const el = track.current;
        const host = section.current;
        if (!el || !host) return;

        const distance = () => Math.max(el.scrollWidth - window.innerWidth, 0);
        const scroller = el.parentElement as HTMLElement;
        gsap.set(scroller, { overflow: "hidden" });

        gsap.fromTo(
          el,
          { x: () => -distance() },
          {
            x: 0,
            ease: "none",
            scrollTrigger: {
              trigger: host,
              start: "top top",
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 0.8,
              invalidateOnRefresh: true,
              anticipatePin: 1,
            },
          },
        );
        return () => ScrollTrigger.refresh();
      });
      return () => mm.revert();
    },
    { scope: section },
  );

  if (categories.length === 0) return null;
  const ordered = [...categories].reverse();

  return (
    <section
      ref={section}
      id="categories"
      className="bg-surface-sunken relative flex flex-col justify-center py-16 lg:h-svh lg:py-0"
    >
      <div className="container-page mb-8 md:mb-12">
        <p className="text-accent-700 mb-4 inline-flex items-center gap-3 text-xs font-bold tracking-[0.2em]">
          <span aria-hidden="true" className="h-px w-8 bg-current opacity-60" />
          ماذا نطبع
        </p>
        <h2 className="text-[clamp(2.2rem,6vw,5rem)] leading-[1.05] font-black">
          كل ما تحتاجه علامتك،
          <br />
          <span className="text-primary-400">من قسم واحد إلى آخر.</span>
        </h2>
      </div>

      <div className="no-scrollbar overflow-x-auto px-4 pb-4 [scroll-snap-type:x_mandatory] lg:overflow-visible lg:px-0 lg:pb-0">
        <ul
          ref={track}
          dir="ltr"
          className="flex w-max gap-4 lg:gap-6 lg:ps-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:pe-[max(2rem,calc((100vw-80rem)/2+2rem))]"
        >
          {ordered.map((category) => {
            const index = categories.findIndex((c) => c.slug === category.slug);
            return (
              <li
                key={category.slug}
                dir="rtl"
                className="w-[78vw] shrink-0 [scroll-snap-align:center] sm:w-[26rem] lg:w-[30rem]"
              >
                <Link
                  href={`/shop/${category.slug}`}
                  className={cn(
                    "group relative flex h-[26rem] flex-col justify-between overflow-hidden rounded-[2rem] p-7 transition-transform duration-500 hover:-translate-y-2 lg:h-[30rem] lg:p-9",
                    PANELS[index % PANELS.length],
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="text-outline pointer-events-none absolute top-20 -start-3 font-display text-[11rem] leading-none font-black opacity-40 transition-transform duration-700 group-hover:scale-110 lg:text-[14rem]"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="relative flex items-start justify-between">
                    <span className="grid size-14 place-items-center rounded-2xl bg-current/15">
                      <Icon name={resolveIcon(category.iconKey)} className="size-7" strokeWidth={1.5} />
                    </span>
                    <span className="grid size-12 place-items-center rounded-full border border-current/40 transition-[transform,background-color] duration-300 group-hover:-translate-x-1 group-hover:bg-current/15">
                      <Icon name="arrowLeft" className="size-5" strokeWidth={2} />
                    </span>
                  </span>

                  <span className="relative">
                    <span className="font-display block text-3xl leading-tight font-black lg:text-[2.6rem]">
                      {category.name}
                    </span>
                    {category.count > 0 ? (
                      <span className="mt-3 block text-sm font-bold opacity-75">
                        {category.count} منتج جاهز للطلب
                      </span>
                    ) : (
                      <span className="mt-3 block text-sm font-bold opacity-75">
                        اطلب عرض سعر
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
