"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { gsap, MOTION_OK } from "@/lib/gsap";

type Stat = { value: number; label: string; plus?: boolean };

/**
 * شريط أرقام ضخمة على بنفسجي الهوية. الأعداد تعدّ تصاعديًا عند وصول
 * القسم للشاشة (مرة واحدة). النص النهائي موجود في الـ HTML من البداية،
 * فمن لا تعمل عنده الحركة يرى الأرقام الصحيحة مباشرة.
 */
export function StatsBand({ stats }: { stats: Stat[] }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.utils.toArray<HTMLElement>("[data-stat]").forEach((el) => {
          const target = Number(el.dataset.stat);
          const state = { v: 0 };
          el.textContent = "0";
          gsap.to(state, {
            v: target,
            duration: 2,
            ease: "power3.out",
            onUpdate: () => {
              el.textContent = String(Math.round(state.v));
            },
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope },
  );

  return (
    <section ref={scope} className="bg-brand-600 grain relative overflow-hidden text-white">
      <div
        aria-hidden="true"
        className="halftone text-white/[0.08] pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_left,#000,transparent_70%)]"
      />
      <div className="container-page relative py-16 md:py-24">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse border-t-2 border-white/30 pt-5">
              <dt className="mt-2 text-sm font-bold text-white/80 md:text-base">{stat.label}</dt>
              <dd className="font-display flex items-baseline gap-1 text-[clamp(3.5rem,8.5vw,7.5rem)] leading-none font-black">
                {stat.plus === false ? null : (
                  <span aria-hidden="true" className="text-accent-300 text-[0.5em]">+</span>
                )}
                <span data-stat={stat.value}>{stat.value}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
