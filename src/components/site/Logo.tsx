import Image from "next/image";
import Link from "next/link";

import { brand, logo } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * الشعار.
 *
 * ⚠️ ملف الشعار المتجهي لم يصل بعد. حتى يوصل، يُعرض شعار نصّي مبني من اسم
 *    الشركة واختصارها بألوان الهوية الحقيقية (بنفسجي داكن + ذهبي).
 *
 *    لتفعيل الشعار الأصلي:
 *      ١. ضع الملفات في public/brand/ بالأسماء المذكورة في config/brand.ts
 *      ٢. اضبط logo.available على true
 *    لا يحتاج الأمر أي تعديل آخر — كل الموقع يقرأ من هنا.
 */
export function Logo({
  variant = "dark",
  className,
  priority = false,
}: {
  /** dark = على خلفية فاتحة | light = على خلفية داكنة */
  variant?: "dark" | "light";
  className?: string;
  priority?: boolean;
}) {
  const content = logo.available ? (
    <Image
      src={variant === "light" ? logo.onDark : logo.primary}
      alt={logo.alt}
      width={logo.width}
      height={logo.height}
      priority={priority}
      className="h-11 w-auto md:h-14"
    />
  ) : (
    <TextLogo variant={variant} />
  );

  return (
    <Link
      href="/"
      aria-label={`${brand.name} — الصفحة الرئيسية`}
      className={cn(
        "focus-visible:outline-accent-500 inline-flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-85",
        className,
      )}
    >
      {content}
    </Link>
  );
}

function TextLogo({ variant }: { variant: "dark" | "light" }) {
  const isLight = variant === "light";

  return (
    <span className="flex items-center gap-2.5">
      {/*
        علامة مؤقتة: اختصار الشركة داخل مربّع بألوان الهوية.
        الزاوية العلوية اليسرى والسفلية اليمنى مقصوصتان بزاوية ٤٥° لتتناغم
        مع الأسلوب الهندسي للشعار الأصلي.
      */}
      <span
        aria-hidden="true"
        className={cn(
          "grid size-11 shrink-0 place-items-center font-black md:size-12",
          "[clip-path:polygon(28%_0,100%_0,100%_72%,72%_100%,0_100%,0_28%)]",
          isLight ? "bg-accent-500 text-primary-950" : "bg-primary-900 text-accent-500",
        )}
      >
        <span className="text-[0.72rem] leading-none tracking-tight md:text-[0.8rem]">
          {brand.abbreviation}
        </span>
      </span>

      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "font-display truncate text-[0.95rem] font-extrabold md:text-lg",
            isLight ? "text-white" : "text-primary-950",
          )}
        >
          {brand.nameShort}
        </span>
        <span
          className={cn(
            "mt-1 truncate text-[0.6rem] font-medium md:text-[0.66rem]",
            isLight ? "text-accent-300" : "text-primary-500",
          )}
        >
          للطباعة والتجهيزات الدعائية
        </span>
      </span>
    </span>
  );
}
