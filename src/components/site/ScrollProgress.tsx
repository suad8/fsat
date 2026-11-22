"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { gsap, MOTION_OK } from "@/lib/gsap";

/** شريط تقدّم القراءة أعلى الصفحة، مرتبط بالتمرير عبر scrub. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo(
        bar.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: document.documentElement,
            start: "top top",
            end: "max",
            scrub: 0.3,
          },
        },
      );
    });
    return () => mm.revert();
  });

  return (
    <div
      ref={bar}
      aria-hidden="true"
      className="bg-accent-500 pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-right"
    />
  );
}
