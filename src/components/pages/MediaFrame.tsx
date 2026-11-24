import { Icon, type IconName } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { cn } from "@/lib/utils";

const RATIO = {
  "4/3": "aspect-4/3",
  "16/10": "aspect-16/10",
  "3/2": "aspect-3/2",
  square: "aspect-square",
} as const;

/**
 * إطار وسائط بنسبة ثابتة.
 *
 * إن وُجدت صورة تُعرض كما هي. وإن غابت يُرسم لوح حبري زخرفي بأيقونة القسم
 * (بلا عبارات «بانتظار صورة») حتى لا تبدو الصفحة ناقصة ولا نعرض صورة مختلقة.
 */
export function MediaFrame({
  src,
  alt,
  icon = "package",
  ratio = "16/10",
  index,
  className,
  sizes,
  priority,
  zoomOnHover,
}: {
  src?: string | null;
  alt: string;
  icon?: IconName;
  ratio?: keyof typeof RATIO;
  /** رقم تسلسلي كبير يظهر على اللوح الزخرفي. */
  index?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  zoomOnHover?: boolean;
}) {
  if (src) {
    return (
      <SmartImage
        src={src}
        alt={alt}
        ratio="auto"
        icon={icon}
        sizes={sizes}
        priority={priority}
        zoomOnHover={zoomOnHover}
        className={cn(RATIO[ratio], className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("bg-ink relative isolate overflow-hidden", RATIO[ratio], className)}
    >
      <div
        aria-hidden="true"
        className="halftone halftone-fade pointer-events-none absolute inset-0 text-white/[0.09]"
      />
      <div
        aria-hidden="true"
        className="bg-accent-500/20 pointer-events-none absolute -end-10 -top-10 size-44 rounded-full blur-[70px]"
      />
      <div
        aria-hidden="true"
        className="bg-brand-600/30 pointer-events-none absolute -bottom-12 -start-8 size-44 rounded-full blur-[70px]"
      />

      {index !== undefined ? (
        <span
          aria-hidden="true"
          className="font-display text-outline pointer-events-none absolute start-4 bottom-1 text-[4.5rem] leading-none font-black text-white/25 select-none"
        >
          {String(index).padStart(2, "0")}
        </span>
      ) : null}

      <span className="absolute inset-0 grid place-items-center">
        <span className="ring-accent-400/40 text-accent-400 grid size-16 place-items-center rounded-2xl bg-white/5 ring-1 backdrop-blur-sm">
          <Icon name={icon} className="size-8" strokeWidth={1.3} />
        </span>
      </span>
    </div>
  );
}
