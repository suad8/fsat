"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";

import { gsap } from "@/lib/gsap";

/**
 * تأثير مغناطيسي: الزر ينجذب قليلًا نحو المؤشر عند اقترابه، ثم يعود بمرونة.
 * للمؤشر الدقيق فقط ولمن لم يطلب تقليل الحركة.
 */
export function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
          const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
          const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            x((e.clientX - (r.left + r.width / 2)) * strength);
            y((e.clientY - (r.top + r.height / 2)) * strength);
          };
          const reset = () => {
            x(0);
            y(0);
          };
          el.addEventListener("pointermove", move);
          el.addEventListener("pointerleave", reset);
          return () => {
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerleave", reset);
          };
        },
      );
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className="inline-flex">
      {children}
    </span>
  );
}
