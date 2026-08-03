"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * ظهور تدريجي عند الوصول للعنصر أثناء التمرير.
 *
 * يعتمد على IntersectionObserver بدل مستمع scroll، فلا يُنفَّذ أي كود
 * أثناء التمرير نفسه ولا يؤثر على الأداء. المراقبة تتوقف بعد أول ظهور.
 *
 * الصنف يُضاف مباشرة على عنصر الـ DOM عبر ref بدل حالة React: هذا تحديث
 * لنظام خارجي (الـ DOM) وهو الاستخدام المقصود للـ effect، ويتجنّب دورة
 * إعادة رسم كاملة لكل عنصر يظهر في الشاشة.
 *
 * الحالة الابتدائية (الشفافية صفر) معرّفة في globals.css داخل
 * prefers-reduced-motion: no-preference، فمن يعطّل الحركات يرى المحتوى
 * مباشرة، ومن يعطّل الـ JavaScript كذلك.
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

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // المتصفحات القديمة أو بيئات الاختبار: أظهر المحتوى فورًا
    if (typeof IntersectionObserver === "undefined") {
      node.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.disconnect();
      },
      // rootMargin سالب من الأسفل حتى يبدأ الظهور بعد دخول جزء معقول من العنصر
      { threshold: 0.08, rootMargin: "0px 0px -60px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
