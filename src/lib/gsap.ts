"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * نقطة التسجيل الوحيدة لـ GSAP.
 *
 * تُسجَّل الإضافات مرة واحدة هنا، وكل مكوّن حركة يستورد منها بدل أن يستورد
 * gsap مباشرة — فلا يُنسى التسجيل ولا يتكرر. الملف للعميل فقط لأن GSAP يلمس
 * window عند التحميل.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out", duration: 0.8 });
}

/** يعمل فقط لمن لم يطلب تقليل الحركة — وإلا يبقى المحتوى ظاهرًا كما هو. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger };
