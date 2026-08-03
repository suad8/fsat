import Link from "next/link";

import { Icon, resolveIcon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
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
 * اللمس على الجوال دون تكرار روابط متداخلة تُربك قارئ الشاشة.
 */
export function ServiceCard({
  service,
  showImage = true,
  className,
}: {
  service: ServiceCardData;
  showImage?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group border-border bg-surface relative flex flex-col overflow-hidden rounded-xl border",
        "shadow-card hover:shadow-card-hover hover:border-border-strong transition-[box-shadow,border-color] duration-300",
        "focus-within:outline-accent-600 focus-within:outline-2 focus-within:outline-offset-2",
        className,
      )}
    >
      {showImage ? (
        <SmartImage
          src={service.imageUrl}
          alt={service.imageAlt ?? service.title}
          ratio="16/9"
          icon={resolveIcon(service.iconKey)}
          placeholderLabel={service.title}
          zoomOnHover
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      ) : null}

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <span
          aria-hidden="true"
          className="bg-accent-50 text-accent-700 ring-accent-600/15 group-hover:bg-brand-600 mb-4 grid size-11 place-items-center rounded-lg ring-1 transition-colors group-hover:text-white"
        >
          <Icon name={resolveIcon(service.iconKey)} className="size-[1.35rem]" />
        </span>

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

        <span className="text-accent-700 group-hover:text-accent-800 mt-5 inline-flex items-center gap-1.5 text-sm font-bold">
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
