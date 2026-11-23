"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";

import { gsap, MOTION_OK } from "@/lib/gsap";

/**
 * حركة القسم الرئيسي:
 *  - كلمات العنوان تصعد من خلف قناع بتتابع (data-w)، ثم بقية العناصر
 *  - أقراص الحبر الملوّنة تطفو ببطء وتتبع المؤشر (data-disc)
 *  - بارالاكس مرتبط بالتمرير (data-parallax)، ودوران بطيء (data-spin)
 */
export function HeroMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: "power4.out" } })
          .fromTo(
            "[data-w]",
            { autoAlpha: 0, yPercent: 120, rotate: 5 },
            { autoAlpha: 1, yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.09 },
          )
          .fromTo(
            "[data-hero-text]",
            { autoAlpha: 0, y: 28 },
            { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 },
            0.45,
          )
          .fromTo(
            "[data-hero-visual]",
            { autoAlpha: 0, y: 60, scale: 0.92 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 1.1, stagger: 0.12 },
            0.6,
          );

        gsap.to("[data-spin]", { rotation: 360, duration: 24, ease: "none", repeat: -1 });

        // الأقراص تطفو بشكل عشوائي بطيء
        gsap.utils.toArray<HTMLElement>("[data-disc]").forEach((disc, index) => {
          gsap.to(disc, {
            x: () => gsap.utils.random(-80, 80),
            y: () => gsap.utils.random(-60, 60),
            scale: () => gsap.utils.random(0.9, 1.25),
            duration: gsap.utils.random(7, 11),
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            delay: index * 0.6,
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
          gsap.to(el, {
            yPercent: Number(el.dataset.parallax) || 20,
            ease: "none",
            scrollTrigger: {
              trigger: scope.current?.parentElement,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        });

        // ...وتنجذب قليلًا نحو المؤشر (للفأرة فقط)
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          const host = scope.current;
          const layer = host?.querySelector<HTMLElement>("[data-disc-layer]");
          if (host && layer) {
            const qx = gsap.quickTo(layer, "x", { duration: 1.4, ease: "power3" });
            const qy = gsap.quickTo(layer, "y", { duration: 1.4, ease: "power3" });
            const move = (e: PointerEvent) => {
              qx((e.clientX / window.innerWidth - 0.5) * 70);
              qy((e.clientY / window.innerHeight - 0.5) * 50);
            };
            window.addEventListener("pointermove", move);
            return () => window.removeEventListener("pointermove", move);
          }
        }

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
