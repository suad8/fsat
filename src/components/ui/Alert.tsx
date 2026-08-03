import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONES: Record<AlertTone, { box: string; icon: IconName; iconColor: string }> = {
  info: {
    box: "bg-info-50 border-info-500/25 text-info-700",
    icon: "info",
    iconColor: "text-info-600",
  },
  success: {
    box: "bg-success-50 border-success-500/25 text-success-700",
    icon: "check",
    iconColor: "text-success-600",
  },
  warning: {
    box: "bg-warning-50 border-warning-500/25 text-warning-700",
    icon: "alert",
    iconColor: "text-warning-600",
  },
  danger: {
    box: "bg-danger-50 border-danger-500/25 text-danger-700",
    icon: "alert",
    iconColor: "text-danger-600",
  },
};

/**
 * رسالة حالة.
 *
 * role="alert" يجعل قارئ الشاشة ينطق الرسالة فور ظهورها — مهم لرسائل
 * الخطأ بعد إرسال النماذج.
 */
export function Alert({
  tone = "info",
  title,
  children,
  className,
  live = false,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
  live?: boolean;
}) {
  const config = TONES[tone];

  return (
    <div
      role={live ? "alert" : undefined}
      className={cn("flex gap-3 rounded-lg border p-4 text-sm", config.box, className)}
    >
      <Icon
        name={config.icon}
        className={cn("mt-0.5 size-5", config.iconColor)}
        strokeWidth={1.8}
      />
      <div className="min-w-0 flex-1">
        {title ? <p className="mb-1 font-bold">{title}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}
