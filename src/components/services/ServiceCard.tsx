import Link from "next/link";

import { MediaFrame } from "@/components/pages/MediaFrame";
import { audienceFor } from "@/components/pages/insights";
import { Icon, resolveIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type ServiceCardData = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  iconKey: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
};

/**
 * بطاقة خدمة.
 *
 * البطاقة كاملة قابلة للنقر عبر طبقة ممتدة من الرابط (::after)، فتكبر مساحة
 * اللمس على الجوال دون تكرار روابط متداخلة تُربك قارئ الشاشة. الصورة بنسبة
 * ثابتة؛ وإن غابت يظهر لوح حبري بأيقونة الخدمة فتبقى الشبكة متناسقة.
 */
export function ServiceCard({
  service,
  index,
  className,
}: {
  service: ServiceCardData;
  /** رقم تسلسلي يظهر على اللوح الزخرفي. */
  index?: number;
  className?: string;
}) {
  const audience = audienceFor(service.iconKey);

  return (
    <article
      className={cn(
        "group border-border bg-surface shadow-card relative flex h-full flex-col overflow-hidden rounded-2xl border",
        "hover:shadow-card-hover hover:border-border-strong transition-[box-shadow,border-color] duration-300",
        "focus-within:outline-accent-600 focus-within:outline-2 focus-within:outline-offset-2",
        className,
      )}
    >
      <MediaFrame
        src={service.imageUrl}
        alt={service.imageAlt ?? service.title}
        icon={resolveIcon(service.iconKey)}
        index={index}
        ratio="16/10"
        zoomOnHover
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <h3 className="text-lg leading-snug font-bold">
          <Link
            href={`/services/${service.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {service.title}
          </Link>
        </h3>

        <p className="text-primary-600 mt-2.5 line-clamp-3 text-sm leading-relaxed">
          {service.shortDescription}
        </p>

        {audience ? (
          <p className="text-primary-500 border-border mt-4 line-clamp-2 border-t pt-4 text-xs leading-relaxed">
            <span className="text-primary-800 font-bold">تناسب: </span>
            {audience}
          </p>
        ) : null}

        <span className="text-accent-700 group-hover:text-accent-800 mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold">
          تفاصيل الخدمة
          <Icon
            name="arrowLeft"
            className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
            strokeWidth={2}
          />
        </span>
      </div>
    </article>
  );
}
