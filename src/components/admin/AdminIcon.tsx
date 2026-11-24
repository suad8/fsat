import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * أيقونات إضافية للوحة التحكم فقط (نسخ، طباعة، شمس/قمر، أوامر…).
 * مجموعة الموقع العامة لا تُعدَّل من هذا المحور، فالإضافات هنا بنفس أسلوب
 * الخطوط (stroke) كي تتجانس بصريًا مع بقية الأيقونات.
 */

const EXTRA = {
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V3h10v6" />
      <rect x="4" y="9" width="16" height="8" rx="2" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
  command: (
    <path d="M9 9V6.5A2.5 2.5 0 1 0 6.5 9H9zm0 0h6m-6 0v6m6-6V6.5A2.5 2.5 0 1 1 17.5 9H15zm0 0v6m0 0h2.5a2.5 2.5 0 1 1-2.5 2.5V15zm0 0H9m0 0H6.5A2.5 2.5 0 1 0 9 17.5V15z" />
  ),
  arrowUpLeft: <path d="M17 17 7 7M7 15V7h8" />,
  dots: (
    <>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  sortDesc: <path d="M7 4v16m0 0-3-3m3 3 3-3M14 6h6M14 11h4M14 16h2" />,
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9z" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
    </>
  ),
  chevronUp: <path d="m6 15 6-6 6 6" />,
  save: (
    <>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 4v5h7V4M8 20v-6h8v6" />
    </>
  ),
} as const;

export type AdminIconName = IconName | keyof typeof EXTRA;

export function AdminIcon({
  name,
  className,
  strokeWidth = 1.6,
}: {
  name: AdminIconName;
  className?: string;
  strokeWidth?: number;
}) {
  if (name in EXTRA) {
    const paths: ReactNode = EXTRA[name as keyof typeof EXTRA];
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("size-5 shrink-0", className)}
        aria-hidden="true"
        focusable="false"
      >
        {paths}
      </svg>
    );
  }

  return <Icon name={name as IconName} className={className} strokeWidth={strokeWidth} />;
}
