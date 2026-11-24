"use client";

import { useSyncExternalStore } from "react";

import { getOpenStatus, type Schedule } from "@/components/pages/hours";
import { cn } from "@/lib/utils";

/** نبضة كل نصف دقيقة — تكفي لتحديث حالة «مفتوح الآن» عند تغيّر الساعة. */
function subscribe(callback: () => void) {
  const id = window.setInterval(callback, 30_000);
  return () => window.clearInterval(id);
}

const getMinute = () => Math.floor(Date.now() / 60_000);
const getServerMinute = () => null;

/**
 * شارة «مفتوح الآن / مغلق الآن» محسوبة بتوقيت الرياض.
 *
 * تُحسب على المتصفح فقط (على الخادم لا نعرف لحظة الزيارة الفعلية والصفحة
 * قد تكون مخزّنة)، ولذلك لا تظهر قبل التركيب — فلا يحدث اختلاف بين HTML
 * الخادم والعميل.
 */
export function OpenNowBadge({
  schedule,
  className,
  tone = "light",
}: {
  schedule: Schedule;
  className?: string;
  tone?: "light" | "dark";
}) {
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);

  // نحجز المساحة قبل التركيب حتى لا يقفز التخطيط
  if (minute === null) {
    return <span aria-hidden="true" className={cn("inline-block h-7 w-44", className)} />;
  }

  const status = getOpenStatus(schedule, minute * 60_000);

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset",
        status.open
          ? "bg-success-50 text-success-700 ring-success-500/25"
          : tone === "dark"
            ? "bg-white/10 text-primary-200 ring-white/15"
            : "bg-surface-sunken text-primary-700 ring-border-strong",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          status.open ? "bg-success-500" : "bg-primary-400",
        )}
      />
      {status.label}
    </span>
  );
}
