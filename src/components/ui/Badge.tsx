import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "dark";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-primary-100 text-primary-700 ring-primary-500/15",
  accent: "bg-accent-50 text-accent-800 ring-accent-600/20",
  success: "bg-success-50 text-success-700 ring-success-500/20",
  warning: "bg-warning-50 text-warning-700 ring-warning-500/20",
  danger: "bg-danger-50 text-danger-700 ring-danger-500/20",
  info: "bg-info-50 text-info-700 ring-info-500/20",
  dark: "bg-primary-950 text-white ring-primary-950/20",
};

export function Badge({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: IconName;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} className="size-3.5" strokeWidth={2} /> : null}
      {children}
    </span>
  );
}

/**
 * وسم المحتوى المؤقت.
 * يجعل كل نص أو صورة تحتاج استبدالاً ظاهرة فورًا بدل أن تمرّ دون انتباه.
 */
export function PlaceholderBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warning" icon="alert" className={className}>
      يحتاج استبدال
    </Badge>
  );
}

/** تقييم بالنجوم — للعرض فقط. */
export function Rating({
  value,
  className,
  showValue = false,
}: {
  value: number;
  className?: string;
  showValue?: boolean;
}) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`التقييم ${rounded} من 5`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Icon
          key={index}
          name="star"
          className={cn(
            "size-4",
            index < rounded ? "fill-accent-400 text-accent-400" : "text-primary-300",
          )}
          strokeWidth={1.4}
        />
      ))}
      {showValue ? (
        <span className="text-primary-600 me-1 text-xs font-bold">{rounded}.0</span>
      ) : null}
    </span>
  );
}
