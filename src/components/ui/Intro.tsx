"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";

import { gsap, MOTION_OK } from "@/lib/gsap";

/**
 * مدخل متتابع لعناصر القسم عند تحميل الصفحة (ترويسات الصفحات الداخلية).
 *
 * يحرّك كل عنصر يحمل data-intro بتتابع واحد عبر timeline. الغلاف
 * display: contents فلا يغيّر التخطيط.
 */
export function Intro({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .fromTo(
            "[data-intro]",
            { autoAlpha: 0, y: 24 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.8,
              stagger: 0.1,
              // لا clearProps هنا: مسح الأنماط المضمّنة يُعيد قاعدة CSS الابتدائية
              // (opacity: 0) فيختفي العنوان بعد انتهاء الحركة
            },
          );
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
