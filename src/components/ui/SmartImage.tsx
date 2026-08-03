import Image from "next/image";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * صورة بحالة احتياطية مصمَّمة.
 *
 * لأن صور الأعمال الحقيقية لم تصل بعد، لا يجوز عرض صور عامة من الإنترنت
 * ولا مربّعات رمادية فارغة. هذا المكوّن يعرض بديلاً أنيقًا يحمل أيقونة القسم
 * ونصًا يوضّح أن الصورة بانتظار الاستبدال — فيبدو الموقع مكتملاً بصريًا
 * ويبقى النقص ظاهرًا وصادقًا في الوقت نفسه.
 *
 * التحميل الكسول مفعّل افتراضيًا؛ استخدم priority لصورة الـ Hero وحدها.
 */

export type ImageRatio = "square" | "4/3" | "3/2" | "16/9" | "3/4" | "auto";

const RATIOS: Record<ImageRatio, string> = {
  square: "aspect-square",
  "4/3": "aspect-4/3",
  "3/2": "aspect-3/2",
  "16/9": "aspect-video",
  "3/4": "aspect-3/4",
  auto: "",
};

type SmartImageProps = {
  src?: string | null;
  alt: string;
  ratio?: ImageRatio;
  /** أيقونة تُعرض في الحالة البديلة، تعكس نوع المحتوى. */
  icon?: IconName;
  /** نص صغير أسفل الأيقونة في الحالة البديلة. */
  placeholderLabel?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  /** يكبّر الصورة قليلاً عند مرور المؤشر — للبطاقات القابلة للنقر. */
  zoomOnHover?: boolean;
};

export function SmartImage({
  src,
  alt,
  ratio = "4/3",
  icon = "image",
  placeholderLabel,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
  className,
  imageClassName,
  zoomOnHover = false,
}: SmartImageProps) {
  const wrapper = cn(
    "relative overflow-hidden bg-surface-sunken",
    RATIOS[ratio],
    className,
  );

  if (!src) {
    return (
      <div className={wrapper} role="img" aria-label={alt}>
        <PlaceholderArt icon={icon} label={placeholderLabel} />
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        className={cn(
          "object-cover",
          zoomOnHover &&
            "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]",
          imageClassName,
        )}
      />
    </div>
  );
}

/**
 * الحالة البديلة: نقشة قطرية خفيفة بألوان الهوية + أيقونة + وسم واضح.
 * النقشة مرسومة بـ CSS فلا تُحمَّل أي ملفات إضافية.
 */
function PlaceholderArt({ icon, label }: { icon: IconName; label?: string }) {
  return (
    <div
      className="from-primary-50 to-surface-sunken absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-bl"
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, transparent 0 10px, rgb(0 0 0 / 0.018) 10px 20px)",
      }}
    >
      <Icon name={icon} className="text-primary-300 size-9" strokeWidth={1.2} />
      {label ? (
        <span className="text-primary-400 px-3 text-center text-[0.7rem] leading-tight font-medium">
          {label}
        </span>
      ) : null}
      <span className="text-primary-300/80 px-3 text-center text-[0.62rem] leading-tight">
        بانتظار صورة العمل
      </span>
    </div>
  );
}
