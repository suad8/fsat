import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { cn } from "@/lib/utils";

export type ProjectCardData = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  materials: string | null;
  dimensions: string | null;
  category: { slug: string; name: string };
  images: { url: string; alt: string }[];
};

/**
 * بطاقة مشروع في معرض الأعمال.
 *
 * التفاصيل (الخامات والمقاسات) تظهر بالتدريج عند مرور المؤشر على الشاشات
 * الكبيرة، وتبقى ظاهرة دائمًا على الجوال حيث لا يوجد مؤشر.
 */
export function ProjectCard({
  project,
  className,
  priority = false,
}: {
  project: ProjectCardData;
  className?: string;
  priority?: boolean;
}) {
  const cover = project.images[0];

  return (
    <article
      className={cn(
        "group bg-primary-950 relative overflow-hidden rounded-xl",
        "focus-within:outline-accent-600 focus-within:outline-2 focus-within:outline-offset-2",
        className,
      )}
    >
      <SmartImage
        src={cover?.url}
        alt={cover?.alt ?? project.title}
        ratio="4/3"
        icon="image"
        placeholderLabel={project.title}
        priority={priority}
        zoomOnHover
        imageClassName="transition-[transform,opacity] duration-500 group-hover:opacity-85"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />

      {/* تدرّج يضمن تباينًا كافيًا للنص فوق أي صورة */}
      <div
        aria-hidden="true"
        className="from-primary-950 via-primary-950/55 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
        <Badge tone="dark" className="mb-2.5 bg-white/15 text-white ring-white/20">
          {project.category.name}
        </Badge>

        <h3 className="text-base leading-snug font-bold text-white md:text-lg">
          <Link
            href={`/portfolio/${project.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {project.title}
          </Link>
        </h3>

        <div
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "max-h-24 opacity-100",
            "md:max-h-0 md:opacity-0 md:group-hover:max-h-24 md:group-hover:opacity-100 md:group-focus-within:max-h-24 md:group-focus-within:opacity-100",
          )}
        >
          {project.summary ? (
            <p className="text-primary-300 mt-2 line-clamp-2 text-xs leading-relaxed md:text-sm">
              {project.summary}
            </p>
          ) : null}

          <ul className="text-primary-400 mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem]">
            {project.materials ? (
              <li className="inline-flex items-center gap-1">
                <Icon name="layers" className="size-3.5" strokeWidth={1.8} />
                {project.materials}
              </li>
            ) : null}
            {project.dimensions ? (
              <li className="inline-flex items-center gap-1">
                <Icon name="package" className="size-3.5" strokeWidth={1.8} />
                {project.dimensions}
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </article>
  );
}
