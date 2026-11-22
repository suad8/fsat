"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";

import { gsap, MOTION_OK } from "@/lib/gsap";

/**
 * حركة القسم الرئيسي:
 *  - مدخل متتابع للنص ثم العرض البصري (timeline واحد)
 *  - عدّاد تصاعدي للأرقام (data-count)
 *  - بارالاكس للتوهّجين الخلفيين مرتبط بالتمرير (data-parallax = شدّة الحركة)
 */
export function HeroMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.fromTo(
          "[data-hero-text]",
          { autoAlpha: 0, y: 30 },
          { autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.11 },
        ).fromTo(
          "[data-hero-visual]",
          { autoAlpha: 0, y: 50, scale: 0.94 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 1, stagger: 0.12 },
          0.25,
        );

        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count);
          if (!Number.isFinite(target)) return;
          const prefix = el.dataset.prefix ?? "";
          const state = { value: 0 };
          gsap.to(state, {
            value: target,
            duration: 1.8,
            delay: 0.5,
            ease: "power2.out",
            onUpdate: () => {
              el.textContent = `${prefix}${Math.round(state.value)}`;
            },
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
          gsap.to(el, {
            yPercent: Number(el.dataset.parallax) || 20,
            ease: "none",
            scrollTrigger: {
              trigger: scope.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        });
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className="contents">
      {children}
    </div>
  );
}
