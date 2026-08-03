import { commerce } from "@/config/brand";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";

/**
 * عرض السعر بشكل موحّد في كل الموقع.
 *
 * رمز العملة عنصر منفصل بحجم أصغر ووزن أخف، فيبرز الرقم وهو المعلومة
 * التي يبحث عنها العميل.
 */
export function Price({
  value,
  size = "md",
  /** يسبق السعر بعبارة "يبدأ من". */
  startsFrom = false,
  /** سعر قبل الخصم يُعرض مشطوبًا. */
  compareAt,
  className,
  tone = "default",
}: {
  value: number;
  size?: "sm" | "md" | "lg" | "xl";
  startsFrom?: boolean;
  compareAt?: number | null;
  className?: string;
  tone?: "default" | "accent" | "light";
}) {
  const sizes = {
    sm: { amount: "text-sm", symbol: "text-[0.65rem]", prefix: "text-[0.65rem]" },
    md: { amount: "text-lg", symbol: "text-xs", prefix: "text-xs" },
    lg: { amount: "text-2xl", symbol: "text-sm", prefix: "text-xs" },
    xl: { amount: "text-3xl md:text-4xl", symbol: "text-base", prefix: "text-sm" },
  }[size];

  const tones = {
    default: "text-primary-950",
    accent: "text-accent-700",
    light: "text-white",
  }[tone];

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1.5", className)}>
      {startsFrom ? (
        <span className={cn("text-primary-500 font-medium", sizes.prefix)}>يبدأ من</span>
      ) : null}

      <span className={cn("font-bold tabular-nums", sizes.amount, tones)}>
        {formatPrice(value)}
      </span>

      <span className={cn("text-primary-500 font-medium", sizes.symbol)}>
        {commerce.currencySymbol}
      </span>

      {compareAt && compareAt > value ? (
        <span
          className={cn("text-primary-400 font-medium line-through", sizes.prefix)}
          aria-label={`السعر قبل الخصم ${formatPrice(compareAt)} ${commerce.currencySymbol}`}
        >
          {formatPrice(compareAt)}
        </span>
      ) : null}
    </span>
  );
}

/** يُعرض بدل السعر للمنتجات التي تحتاج مراجعة مواصفات. */
export function QuoteOnlyLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-accent-700 inline-flex items-center text-sm font-bold",
        className,
      )}
    >
      السعر حسب المواصفات
    </span>
  );
}
