"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";

import { gsap, MOTION_OK } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * ظهور العنصر عند الوصول إليه أثناء التمرير، بـ GSAP + ScrollTrigger.
 *
 * الحالة الابتدائية المخفية معرّفة في globals.css داخل
 * prefers-reduced-motion: no-preference وscripting: enabled، فمن يعطّل
 * الحركات أو الـ JavaScript يرى المحتوى مباشرة. عند انتهاء الحركة تُنظَّف
 * الأنماط المضمّنة فيعود العنصر لتنسيق CSS العادي دون أثر على التفاعلات.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  /** تأخير بالملي ثانية — لتتابع ظهور عناصر الشبكة. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const node = ref.current;
      if (!node) return;

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          node,
          { autoAlpha: 0, y: 36 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            delay: delay / 1000,
            ease: "power3.out",
            scrollTrigger: { trigger: node, start: "top 90%", once: true },
            onComplete: () => {
              node.classList.add("is-visible");
              gsap.set(node, { clearProps: "opacity,visibility,transform" });
            },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [delay] },
  );

  return (
    <Tag ref={ref} className={cn("reveal", className)}>
      {children}
    </Tag>
  );
}
