"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type TocItem = { id: string; title: string };

/**
 * فهرس السياسة: روابط إلى أقسامها مع تمييز القسم الظاهر حاليًا أثناء القراءة.
 * الروابط مراسي عادية (تعمل بلا JavaScript)؛ التمييز إضافة فقط.
 */
export function PolicyToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    const targets = items
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => node !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // أعلى قسم ظاهر في منطقة القراءة (أعلى ثلث الشاشة)
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );

    targets.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [items]);

  return (
    <ol className="space-y-1">
      {items.map((item, index) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            aria-current={active === item.id ? "location" : undefined}
            className={cn(
              "flex gap-3 rounded-lg px-3 py-2 text-sm leading-snug transition-colors",
              active === item.id
                ? "bg-accent-50 text-primary-950 font-bold"
                : "text-primary-600 hover:bg-surface-sunken hover:text-primary-950",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "w-5 shrink-0 font-black",
                active === item.id ? "text-accent-700" : "text-primary-300",
              )}
            >
              {index + 1}
            </span>
            <span className="min-w-0">{item.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
