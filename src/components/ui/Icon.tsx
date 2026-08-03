import { cn } from "@/lib/utils";

/**
 * مجموعة أيقونات مضمّنة كـ SVG.
 *
 * مضمّنة بدل مكتبة خارجية لسببين: لا تُحمَّل حزمة إضافية على العميل،
 * ولأن كل أيقونة تُدرَج فقط عند استخدامها فعليًا. الأيقونات ترث لون النص
 * (currentColor) فتتبع ألوان الهوية تلقائيًا.
 */

export type IconName = keyof typeof PATHS;

const PATHS = {
  // --- التصنيفات والخدمات ---
  box: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12m0 0 8.5-4.5M12 12v9" />
    </>
  ),
  cup: (
    <>
      <path d="M5 8h12l-1 11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
      <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M6 5h10" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  sticker: (
    <>
      <path d="M14.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6l6-6V5a2 2 0 0 0-2-2z" />
      <path d="M19 15h-4a2 2 0 0 0-2 2v4" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  sign: (
    <>
      <rect x="3" y="4" width="18" height="10" rx="2" />
      <path d="M12 14v6M8 20h8" />
      <path d="M7 8h10" />
    </>
  ),
  banner: (
    <>
      <path d="M4 4h16v11H4z" />
      <path d="M4 15v5M20 15v5" />
      <path d="M8 8h8" />
    </>
  ),
  shirt: (
    <>
      <path d="M9 3 4 6l2 4 2-1v11h8V9l2 1 2-4-5-3z" />
      <path d="M9 3a3 3 0 0 0 6 0" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="9" width="18" height="12" rx="1" />
      <path d="M3 13h18M12 9v12" />
      <path d="M12 9S9.5 3 7 5s5 4 5 4M12 9s2.5-6 5-4-5 4-5 4" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M18 15.5 18.8 18l2.2.8-2.2.7-.8 2.5-.8-2.5-2.2-.7 2.2-.8z" />
    </>
  ),
  pen: (
    <>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
      <path d="m14.5 5.5 3 3" />
    </>
  ),

  // --- التنقّل والواجهة ---
  cart: (
    <>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2.5l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.9a1.5 1.5 0 0 0 1.5-1.2L21 7H5.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  check: <path d="m5 13 4 4L19 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  star: (
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
  ),
  externalLink: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),

  // --- التواصل ---
  whatsapp: (
    <path
      d="M12.04 2A9.9 9.9 0 0 0 2.1 11.9c0 1.75.46 3.46 1.34 4.97L2 22l5.28-1.38a9.9 9.9 0 0 0 4.76 1.21h.01A9.9 9.9 0 0 0 22 11.94 9.9 9.9 0 0 0 12.04 2m5.8 14.09c-.24.69-1.42 1.32-1.96 1.36-.5.05-.99.22-3.4-.72-2.87-1.13-4.68-4.07-4.82-4.26-.14-.19-1.15-1.53-1.15-2.92s.73-2.07 1-2.36c.26-.28.57-.35.76-.35s.38 0 .55.01c.18.01.41-.07.64.49.24.57.81 1.98.88 2.12.07.14.12.31.02.5-.09.19-.14.3-.28.47-.14.16-.29.36-.42.49-.14.14-.28.29-.12.57s.72 1.19 1.55 1.93c1.07.95 1.97 1.25 2.25 1.39.28.14.44.12.6-.07.17-.19.7-.81.88-1.09.19-.28.37-.23.63-.14.26.09 1.65.78 1.93.92.28.14.47.21.54.33.07.11.07.66-.17 1.35"
      fill="currentColor"
      stroke="none"
    />
  ),
  phone: (
    <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 6.2 2 2 0 0 1 6.5 3z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  ),

  // --- التواصل الاجتماعي ---
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  twitter: (
    <path
      d="M17.2 3h3.3l-7.2 8.2L22 21h-6.6l-5.2-6.7L4.3 21H1l7.7-8.8L1.4 3H8l4.7 6.2zm-1.2 16h1.8L7.9 4.9H6z"
      fill="currentColor"
      stroke="none"
    />
  ),
  tiktok: (
    <path
      d="M16.5 2h-3v13.2a2.6 2.6 0 1 1-2-2.5V9.6a5.9 5.9 0 1 0 5 5.8V9.1a6.6 6.6 0 0 0 4 1.3V7.3a3.8 3.8 0 0 1-4-3.9z"
      fill="currentColor"
      stroke="none"
    />
  ),
  snapchat: (
    <path
      d="M12 2c2.6 0 4.5 2 4.5 4.6v2c.5.2 1-.3 1.5-.3.6 0 1 .4 1 .9 0 .8-1.4 1-1.7 1.6-.2.4.7 2 2 2.9.4.3.3.9-.2 1.1-.6.2-1.3.3-1.5.6-.1.3 0 .8-.4 1-.4.1-1.2-.2-2-.1-.9.1-1.6 1.7-3.2 1.7s-2.3-1.6-3.2-1.7c-.8-.1-1.6.2-2 .1-.4-.2-.3-.7-.4-1-.2-.3-.9-.4-1.5-.6-.5-.2-.6-.8-.2-1.1 1.3-.9 2.2-2.5 2-2.9C6.4 10.2 5 10 5 9.2c0-.5.4-.9 1-.9.5 0 1 .5 1.5.3v-2C7.5 4 9.4 2 12 2z"
      fill="currentColor"
      stroke="none"
    />
  ),
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7.5 10v7M7.5 7v.01M11.5 17v-4a2.5 2.5 0 0 1 5 0v4" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="m10.5 9.5 5 2.5-5 2.5z" />
    </>
  ),

  // --- المميزات ---
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9.5 4.1-1.9 7-5.3 7-9.5V6z" />
      <path d="m9.2 12 2 2 3.6-3.6" />
    </>
  ),
  truck: (
    <>
      <path d="M2 6h11v10H2z" />
      <path d="M13 9h4l3 3.5V16h-7z" />
      <circle cx="6.5" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  factory: (
    <>
      <path d="M3 21V9l5 3V9l5 3V9l5 3v9z" />
      <path d="M18 12V4h3v8" />
      <path d="M7 17h2M13 17h2" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1 0 1.6-.7 1.6-1.5 0-.4-.2-.7-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8" />
      <circle cx="7.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  headset: (
    <>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <path d="M4 13h2.5v5H5a1 1 0 0 1-1-1zM20 13h-2.5v5H19a1 1 0 0 0 1-1z" />
      <path d="M17.5 18v.5a2.5 2.5 0 0 1-2.5 2.5h-2" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="m8.5 14-1.5 7 5-2.5 5 2.5-1.5-7" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 3s4 2 4 8c0 3-1.5 5-1.5 5h-5S8 14 8 11c0-6 4-8 4-8" />
      <circle cx="12" cy="10" r="1.6" />
      <path d="M9.5 16 7 18.5 8 21M14.5 16l2.5 2.5L16 21" />
    </>
  ),

  // --- لوحة التحكم والنماذج ---
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" />
      <path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 7l1.9 1.1M17.9 15.9l1.9 1.1M4.2 17l1.9-1.1M17.9 8.1 19.8 7" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20v-1a4.5 4.5 0 0 1 4.5-4.5h3A4.5 4.5 0 0 1 15 19v1" />
      <path d="M16 5.3a3.2 3.2 0 0 1 0 5.4M21 20v-1a4.5 4.5 0 0 0-3.2-4.3" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 17v-5M12 17V8M16 17v-7" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z" />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M16 8l4 4-4 4M20 12H9" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 2.5 20h19z" />
      <path d="M12 10v4M12 17v.01" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>
  ),
  package: (
    <>
      <path d="M3 8v9l9 4 9-4V8l-9-4z" />
      <path d="m3 8 9 4 9-4M12 12v9" />
      <path d="m7.5 6 9 4" />
    </>
  ),
} as const;

type IconProps = {
  name: IconName;
  className?: string;
  /** الأيقونات زخرفية افتراضيًا؛ مرّر label عندما تحمل الأيقونة معنى بذاتها. */
  label?: string;
  strokeWidth?: number;
};

export function Icon({ name, className, label, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5 shrink-0", className)}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** يتحقق أن مفتاح الأيقونة القادم من قاعدة البيانات موجود فعلاً. */
export function isIconName(value: string | null | undefined): value is IconName {
  return typeof value === "string" && value in PATHS;
}

/** أيقونة احتياطية عندما يكون المفتاح المخزّن غير معروف. */
export function resolveIcon(value: string | null | undefined): IconName {
  return isIconName(value) ? value : "package";
}
