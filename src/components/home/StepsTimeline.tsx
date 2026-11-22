"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { gsap, MOTION_OK, ScrollTrigger } from "@/lib/gsap";

type Step = { icon: IconName; title: string; description: string };

/**
 * خط زمني عمودي لخطوات الطلب.
 *
 * الخط يمتلئ تدريجيًا مع التمرير (scrub) وكل خطوة تُضاء عند وصولها لمنتصف
 * الشاشة. لمن يفضّل تقليل الحركة تُضاء الخطوات كلها والخط ممتلئ.
 * القائمة <ol> مرقّمة فيفهم قارئ الشاشة الترتيب دون الاعتماد على الشكل.
 */
export function StepsTimeline({ steps }: { steps: Step[] }) {
  const scope = useRef<HTMLOListElement>(null);
  const fill = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const list = scope.current;
      if (!list) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          fill.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: list,
              start: "top 60%",
              end: "bottom 60%",
              scrub: 0.4,
            },
          },
        );

        gsap.utils.toArray<HTMLElement>("[data-step]", list).forEach((step) => {
          ScrollTrigger.create({
            trigger: step,
            start: "top 62%",
            onEnter: () => step.setAttribute("data-active", "true"),
            onLeaveBack: () => step.setAttribute("data-active", "false"),
          });
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(fill.current, { scaleY: 1 });
        list
          .querySelectorAll("[data-step]")
          .forEach((step) => step.setAttribute("data-active", "true"));
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <ol ref={scope} className="relative">
      {/* المسار والتعبئة — زخرفة */}
      <span
        aria-hidden="true"
        className="bg-border absolute inset-y-6 start-[calc(1.75rem-1px)] w-0.5 rounded-full"
      />
      <span
        ref={fill}
        aria-hidden="true"
        className="from-accent-500 to-brand-600 absolute inset-y-6 start-[calc(1.75rem-1px)] w-0.5 origin-top rounded-full bg-gradient-to-b"
      />

      {steps.map((step, index) => (
        <li
          key={step.title}
          data-step
          data-active="false"
          className="group/step relative grid grid-cols-[3.5rem_1fr] items-start gap-5 pb-8 last:pb-0"
        >
          <span
            aria-hidden="true"
            className="border-border bg-surface text-primary-500 relative z-10 grid size-14 place-items-center rounded-2xl border-2 transition-[background-color,border-color,color,transform,box-shadow] duration-500 group-data-[active=true]/step:border-accent-500 group-data-[active=true]/step:bg-accent-500 group-data-[active=true]/step:text-accent-contrast group-data-[active=true]/step:shadow-glow group-data-[active=true]/step:scale-105"
          >
            <Icon name={step.icon} className="size-6" strokeWidth={1.6} />
          </span>

          <div className="border-border bg-surface shadow-card group-data-[active=true]/step:border-border-strong rounded-2xl border p-5 transition-[border-color,transform] duration-500 group-data-[active=true]/step:-translate-x-1">
            <p className="text-accent-700 mb-1 text-xs font-bold tracking-[0.2em]">
              الخطوة {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="text-base font-bold md:text-lg">{step.title}</h3>
            <p className="text-primary-600 mt-1.5 text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
