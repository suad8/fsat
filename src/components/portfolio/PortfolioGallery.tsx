"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { MediaFrame } from "@/components/pages/MediaFrame";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

export type GalleryProject = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  materials: string | null;
  dimensions: string | null;
  categorySlug: string;
  categoryName: string;
  imageUrl: string | null;
  imageAlt: string;
  whatsappUrl: string;
};

export type GalleryCategory = { slug: string; name: string };

/**
 * معرض الأعمال: تصفية فورية + نافذة معاينة سريعة.
 *
 * التصفية بلا إعادة تحميل، ويُحدَّث عنوان الصفحة (?category=) بـ replaceState
 * ليبقى الرابط قابلاً للمشاركة. ثم تبقى صفحة كل مشروع رابطًا حقيقيًا لمحركات
 * البحث ولمن يفتحها مباشرة.
 */
export function PortfolioGallery({
  projects,
  categories,
  initialCategory,
}: {
  projects: GalleryProject[];
  categories: GalleryCategory[];
  initialCategory?: string;
}) {
  const present = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of projects) {
      counts.set(project.categorySlug, (counts.get(project.categorySlug) ?? 0) + 1);
    }
    return categories
      .filter((category) => counts.has(category.slug))
      .map((category) => ({ ...category, count: counts.get(category.slug) ?? 0 }));
  }, [projects, categories]);

  const [active, setActive] = useState<string | null>(
    present.some((category) => category.slug === initialCategory) ? (initialCategory ?? null) : null,
  );
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = active ? projects.filter((project) => project.categorySlug === active) : projects;
  const selected = projects.find((project) => project.id === openId) ?? null;

  function choose(slug: string | null) {
    setActive(slug);
    const url = slug ? `/portfolio?category=${encodeURIComponent(slug)}` : "/portfolio";
    window.history.replaceState(null, "", url);
  }

  return (
    <div>
      {present.length > 1 ? (
        <nav aria-label="تصنيفات الأعمال" className="mb-9">
          <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            <li>
              <Chip active={active === null} onClick={() => choose(null)}>
                الكل <span className="text-[0.7rem] opacity-70">({projects.length})</span>
              </Chip>
            </li>
            {present.map((category) => (
              <li key={category.slug}>
                <Chip active={active === category.slug} onClick={() => choose(category.slug)}>
                  {category.name}{" "}
                  <span className="text-[0.7rem] opacity-70">({category.count})</span>
                </Chip>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {`يعرض ${visible.length} من ${projects.length} مشروعًا`}
      </p>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((project) => (
          <li key={project.id}>
            <article className="group border-border bg-surface shadow-card hover:shadow-card-hover relative overflow-hidden rounded-2xl border transition-shadow duration-300">
              <button
                type="button"
                onClick={() => setOpenId(project.id)}
                aria-label={`معاينة سريعة: ${project.title}`}
                className="block w-full text-start focus-visible:outline-offset-2"
              >
                <MediaFrame
                  src={project.imageUrl}
                  alt={project.imageAlt}
                  icon="image"
                  ratio="4/3"
                  zoomOnHover
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />

                <div className="p-5">
                  <Badge tone="accent">{project.categoryName}</Badge>
                  <h3 className="mt-3 text-base leading-snug font-bold md:text-lg">
                    {project.title}
                  </h3>
                  {project.summary ? (
                    <p className="text-primary-600 mt-2 line-clamp-2 text-sm leading-relaxed">
                      {project.summary}
                    </p>
                  ) : null}
                  <span className="text-accent-700 mt-4 inline-flex items-center gap-1.5 text-sm font-bold">
                    معاينة سريعة
                    <Icon
                      name="arrowLeft"
                      className="size-4 transition-transform group-hover:-translate-x-1"
                      strokeWidth={2}
                    />
                  </span>
                </div>
              </button>
            </article>
          </li>
        ))}
      </ul>

      <Modal
        open={selected !== null}
        onClose={() => setOpenId(null)}
        title={selected?.title ?? "تفاصيل المشروع"}
        size="lg"
      >
        {selected ? (
          <div className="grid gap-6 md:grid-cols-2">
            <MediaFrame
              src={selected.imageUrl}
              alt={selected.imageAlt}
              icon="image"
              ratio="4/3"
              className="rounded-2xl"
              sizes="(max-width: 768px) 100vw, 40vw"
            />

            <div className="flex flex-col">
              <Badge tone="accent" className="self-start">
                {selected.categoryName}
              </Badge>

              {selected.summary ? (
                <p className="text-primary-700 mt-4 leading-[1.9]">{selected.summary}</p>
              ) : null}

              {selected.materials || selected.dimensions ? (
                <dl className="border-border mt-5 space-y-3 border-t pt-5 text-sm">
                  {selected.materials ? (
                    <div>
                      <dt className="text-primary-500 text-xs">الخامات</dt>
                      <dd className="text-primary-900 mt-0.5 font-bold">{selected.materials}</dd>
                    </div>
                  ) : null}
                  {selected.dimensions ? (
                    <div>
                      <dt className="text-primary-500 text-xs">المقاسات</dt>
                      <dd className="text-primary-900 mt-0.5 font-bold">{selected.dimensions}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              <div className="mt-auto grid gap-2.5 pt-6">
                <ButtonLink
                  href={`/quote?type=${encodeURIComponent(selected.categoryName)}&ref=${encodeURIComponent(selected.title)}`}
                  size="lg"
                  variant="accent"
                  icon="document"
                  fullWidth
                >
                  اطلب مشروعًا مشابهًا
                </ButtonLink>
                <div className="grid grid-cols-2 gap-2.5">
                  <ButtonLink
                    href={selected.whatsappUrl}
                    external
                    variant="whatsapp"
                    icon="whatsapp"
                    fullWidth
                  >
                    واتساب
                  </ButtonLink>
                  <Link
                    href={`/portfolio/${selected.slug}`}
                    className="border-border-strong text-primary-900 hover:bg-surface-muted inline-flex min-h-11 items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-bold transition-colors"
                  >
                    التفاصيل الكاملة
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors",
        active
          ? "border-ink bg-ink text-white"
          : "border-border-strong bg-surface text-primary-700 hover:border-primary-400 hover:bg-surface-muted",
      )}
    >
      {children}
    </button>
  );
}
