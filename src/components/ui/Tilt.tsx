"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";

import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * إمالة ثلاثية الأبعاد خفيفة + بقعة ضوء تتبع المؤشر، بـ GSAP quickTo.
 *
 * تعمل فقط على الأجهزة التي فيها مؤشر دقيق (فأرة) ولمن لم يطلب تقليل الحركة؛
 * على اللمس لا يُضاف أي مستمع. الإمالة محدودة بدرجات قليلة حتى لا تعيق
 * النقر على الأزرار داخل البطاقة.
 */
export function Tilt({
  children,
  className,
  max = 4,
}: {
  children: ReactNode;
  className?: string;
  /** أقصى زاوية إمالة بالدرجات. */
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.set(el, { transformPerspective: 900 });
          const rotX = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3" });
          const rotY = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3" });

          const onMove = (event: PointerEvent) => {
            const rect = el.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width;
            const py = (event.clientY - rect.top) / rect.height;
            rotY((px - 0.5) * max * 2);
            rotX(-(py - 0.5) * max * 2);
            el.style.setProperty("--mx", `${px * 100}%`);
            el.style.setProperty("--my", `${py * 100}%`);
          };
          const onLeave = () => {
            rotX(0);
            rotY(0);
          };

          el.addEventListener("pointermove", onMove);
          el.addEventListener("pointerleave", onLeave);
          return () => {
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerleave", onLeave);
          };
        },
      );
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn("spotlight h-full will-change-transform", className)}>
      {children}
    </div>
  );
}
