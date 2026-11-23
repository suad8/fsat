"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { gsap } from "@/lib/gsap";

/**
 * مؤشر مخصّص للفأرة: حلقة ذهبية تلحق المؤشر بتأخّر ناعم وتتضخّم فوق الروابط
 * والأزرار. المؤشر الأصلي يبقى ظاهرًا (الحلقة إضافة لا بديل)، ولا يُركَّب أصلًا
 * على اللمس أو لمن يفضّل تقليل الحركة.
 */
export function CustomCursor() {
  const ring = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = ring.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      gsap.set(el, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
      const x = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3" });
      const y = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3" });

      const move = (e: PointerEvent) => {
        x(e.clientX);
        y(e.clientY);
        gsap.to(el, { autoAlpha: 1, duration: 0.3, overwrite: "auto" });
        const hot = (e.target as HTMLElement | null)?.closest("a, button, [role='button'], summary, label[for]");
        gsap.to(el, { scale: hot ? 2.4 : 1, duration: 0.35, ease: "power3.out", overwrite: "auto" });
      };
      const leave = () => gsap.to(el, { autoAlpha: 0, duration: 0.3 });

      window.addEventListener("pointermove", move);
      document.documentElement.addEventListener("pointerleave", leave);
      return () => {
        window.removeEventListener("pointermove", move);
        document.documentElement.removeEventListener("pointerleave", leave);
      };
    });
    return () => mm.revert();
  });

  return (
    <div
      ref={ring}
      aria-hidden="true"
      className="border-accent-500 pointer-events-none fixed start-0 top-0 z-[100] size-9 rounded-full border-2 opacity-0 mix-blend-difference"
    />
  );
}
