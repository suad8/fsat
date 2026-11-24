"use client";

import { useEffect, useRef } from "react";

import { gsap, MOTION_OK } from "@/lib/gsap";
import { formatNumber, formatPriceWithCurrency } from "@/lib/utils";

/**
 * حركة اللوحة — حذرة عمدًا: الإدارة أداة عمل لا واجهة عرض.
 *
 *  • AdminEnter: دخول لطيف لعناصر [data-adm-in] عند الانتقال بين الصفحات فقط
 *    (لا عند أول تحميل، فلا وميض). لا توجد حالة مخفية في CSS: إن لم يعمل
 *    JavaScript يبقى كل شيء ظاهرًا.
 *  • CountUp: عدّاد يبدأ من القيمة النهائية مرسومة من الخادم، ويعدّ من الصفر
 *    عند الظهور الأول فقط لمن لم يطلب تقليل الحركة.
 *
 * كل شيء داخل matchMedia فيتوقف تلقائيًا مع prefers-reduced-motion.
 */

export function AdminEnter({ trigger }: { trigger: string }) {
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    const mm = gsap.matchMedia();

    mm.add(MOTION_OK, () => {
      const targets = document.querySelectorAll<HTMLElement>("main [data-adm-in]");
      if (targets.length === 0) return;

      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.42,
          stagger: 0.045,
          ease: "power2.out",
          // يزيل الأنماط المضمّنة كي لا تؤثر على تخطيط لاحق (مثل sticky)
          clearProps: "opacity,visibility,transform",
        },
      );
    });

    return () => mm.revert();
  }, [trigger]);

  return null;
}

export function CountUp({
  value,
  kind = "number",
  className,
}: {
  value: number;
  kind?: "number" | "price";
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const format = kind === "price" ? formatPriceWithCurrency : formatNumber;

  useEffect(() => {
    const element = ref.current;
    if (!element || value === 0) return;

    const mm = gsap.matchMedia();

    mm.add(MOTION_OK, () => {
      const state = { v: 0 };
      const tween = gsap.to(state, {
        v: value,
        duration: 0.9,
        ease: "power2.out",
        onUpdate: () => {
          element.textContent = format(Math.round(state.v));
        },
        onComplete: () => {
          element.textContent = format(value);
        },
      });

      return () => {
        tween.kill();
        element.textContent = format(value);
      };
    });

    return () => mm.revert();
  }, [value, format]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
