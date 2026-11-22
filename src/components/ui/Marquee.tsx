"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { gsap, MOTION_OK } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * شريط نصوص متحرّك بلا نهاية (GSAP).
 *
 * المحتوى يُكرَّر مرتين والمسار يتحرك بمقدار نصف عرضه، فيبدو الحلقة متصلة.
 * يتباطأ عند المرور بالمؤشر. لمن يفضّل تقليل الحركة يبقى الشريط ثابتًا.
 * النسخة المكرّرة مخفية عن قارئ الشاشة.
 */
export function Marquee({
  items,
  className,
  speed = 60,
}: {
  items: string[];
  className?: string;
  /** سرعة الحركة بالبكسل في الثانية. */
  speed?: number;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const node = track.current;
        if (!node) return;
        const distance = node.scrollWidth / 2;
        const tween = gsap.to(node, {
          x: -distance,
          duration: distance / speed,
          ease: "none",
          repeat: -1,
        });

        const slow = () => gsap.to(tween, { timeScale: 0.25, duration: 0.5 });
        const normal = () => gsap.to(tween, { timeScale: 1, duration: 0.5 });
        const host = scope.current;
        host?.addEventListener("pointerenter", slow);
        host?.addEventListener("pointerleave", normal);
        return () => {
          host?.removeEventListener("pointerenter", slow);
          host?.removeEventListener("pointerleave", normal);
        };
      });
      return () => mm.revert();
    },
    { scope },
  );

  const row = (hidden: boolean) =>
    items.map((item, index) => (
      <span
        key={`${hidden ? "b" : "a"}-${index}`}
        aria-hidden={hidden || undefined}
        className="inline-flex items-center gap-8 pe-8"
      >
        <span>{item}</span>
        <span aria-hidden="true" className="bg-accent-500 size-1.5 rotate-45" />
      </span>
    ));

  return (
    <div
      ref={scope}
      className={cn("overflow-hidden", className)}
    >
      {/* dir=ltr: اتجاه الحركة ثابت بغضّ النظر عن RTL الصفحة */}
      <div ref={track} dir="ltr" className="flex w-max items-center whitespace-nowrap">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
