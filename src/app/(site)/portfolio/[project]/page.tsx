import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeading } from "@/components/ui/Section";
import { SmartImage } from "@/components/ui/SmartImage";
import { PROJECT_IMAGE_STAGE_LABELS, type ProjectImageStage } from "@/lib/constants";
import { getProjectBySlug, getProjects } from "@/lib/queries";
import { breadcrumbJsonLd, creativeWorkJsonLd, JsonLd } from "@/lib/seo";
import { formatDate, truncate } from "@/lib/utils";
import { whatsappProjectUrl } from "@/lib/whatsapp";

type Params = Promise<{ project: string }>;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ project: project.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { project: slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) return { title: "المشروع غير موجود" };

  const description = project.seoDescription ?? project.summary ?? project.description ?? "";

  return {
    title: project.seoTitle ?? project.title,
    description: truncate(description, 160),
    alternates: { canonical: `/portfolio/${project.slug}` },
    openGraph: {
      title: project.title,
      description: truncate(description, 200),
      url: `/portfolio/${project.slug}`,
      images: project.images[0]
        ? [{ url: project.images[0].url, alt: project.images[0].alt }]
        : undefined,
    },
  };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { project: slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) notFound();

  const related = (await getProjects({ categorySlug: project.category.slug, limit: 4 })).filter(
    (item) => item.slug !== project.slug,
  );

  const crumbs = [
    { label: "معرض الأعمال", href: "/portfolio" },
    { label: project.category.name, href: `/portfolio?category=${project.category.slug}` },
    { label: project.title, href: `/portfolio/${project.slug}` },
  ];

  // تجميع الصور حسب مرحلتها لعرض "قبل / بعد / مراحل التنفيذ" في مجموعات
  const byStage = groupByStage(project.images);
  const mainImages = byStage.RESULT.length > 0 ? byStage.RESULT : project.images;

  const specs = [
    { label: "نوع المشروع", value: project.category.name, icon: "tag" as const },
    { label: "العميل", value: project.clientName, icon: "users" as const },
    { label: "الخامات المستخدمة", value: project.materials, icon: "layers" as const },
    { label: "المقاسات", value: project.dimensions, icon: "package" as const },
    { label: "تقنيات التنفيذ", value: project.techniques, icon: "settings" as const },
    {
      label: "تاريخ التنفيذ",
      value: project.completedAt ? formatDate(project.completedAt) : null,
      icon: "clock" as const,
    },
  ].filter((spec) => Boolean(spec.value));

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          creativeWorkJsonLd({
            title: project.title,
            description: project.summary ?? project.description,
            slug: project.slug,
            imageUrl: project.images[0]?.url ?? null,
            completedAt: project.completedAt,
          }),
        ]}
      />

      <div className="border-border bg-surface-muted border-b">
        <div className="container-page py-4">
          <Breadcrumbs items={crumbs} />
        </div>
      </div>

      <div className="container-page py-8 md:py-12">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
          {/* --- الصور --- */}
          <div className="lg:col-span-2">
            <div className="grid gap-4">
              {mainImages.length === 0 ? (
                <SmartImage
                  src={null}
                  alt={project.title}
                  ratio="4/3"
                  icon="image"
                  placeholderLabel={project.title}
                  className="rounded-xl"
                />
              ) : (
                mainImages.map((image, index) => (
                  <figure key={image.id}>
                    <SmartImage
                      src={image.url}
                      alt={image.alt}
                      ratio="auto"
                      icon="image"
                      priority={index === 0}
                      className="aspect-4/3 rounded-xl"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                    />
                    {image.caption ? (
                      <figcaption className="text-primary-500 mt-2 text-sm">
                        {image.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ))
              )}
            </div>

            {/* --- قبل وبعد --- */}
            {byStage.BEFORE.length > 0 || byStage.AFTER.length > 0 ? (
              <div className="mt-10">
                <h2 className="mb-4 text-lg font-bold">قبل وبعد</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["BEFORE", "AFTER"] as const).map((stage) =>
                    byStage[stage].map((image) => (
                      <figure key={image.id}>
                        <SmartImage
                          src={image.url}
                          alt={image.alt}
                          ratio="4/3"
                          icon="image"
                          className="rounded-xl"
                        />
                        <figcaption className="text-primary-600 mt-2 text-sm font-bold">
                          {PROJECT_IMAGE_STAGE_LABELS[stage]}
                          {image.caption ? (
                            <span className="text-primary-500 font-normal">
                              {" "}
                              — {image.caption}
                            </span>
                          ) : null}
                        </figcaption>
                      </figure>
                    )),
                  )}
                </div>
              </div>
            ) : null}

            {/* --- مراحل التنفيذ --- */}
            {byStage.PROCESS.length > 0 ? (
              <div className="mt-10">
                <h2 className="mb-4 text-lg font-bold">مراحل التنفيذ</h2>
                <ol className="grid gap-4 sm:grid-cols-3">
                  {byStage.PROCESS.map((image, index) => (
                    <li key={image.id}>
                      <figure>
                        <SmartImage
                          src={image.url}
                          alt={image.alt}
                          ratio="square"
                          icon="settings"
                          className="rounded-xl"
                        />
                        <figcaption className="text-primary-600 mt-2 text-xs">
                          <span className="text-primary-950 font-bold">
                            المرحلة {index + 1}
                          </span>
                          {image.caption ? ` — ${image.caption}` : ""}
                        </figcaption>
                      </figure>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>

          {/* --- التفاصيل --- */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              <Link
                href={`/portfolio?category=${project.category.slug}`}
                className="text-accent-700 hover:text-accent-800 mb-2.5 inline-block text-xs font-bold transition-colors"
              >
                {project.category.name}
              </Link>

              <h1 className="text-2xl md:text-3xl">{project.title}</h1>

              {project.summary ? (
                <p className="text-primary-600 mt-4 leading-relaxed">{project.summary}</p>
              ) : null}

              {project.description ? (
                <p className="text-primary-700 mt-4 leading-[1.9] whitespace-pre-line">
                  {project.description}
                </p>
              ) : null}

              {specs.length > 0 ? (
                <dl className="border-border mt-7 space-y-4 border-t pt-6">
                  {specs.map((spec) => (
                    <div key={spec.label} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="bg-surface-sunken text-primary-500 grid size-9 shrink-0 place-items-center rounded-lg"
                      >
                        <Icon name={spec.icon} className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <dt className="text-primary-500 text-xs">{spec.label}</dt>
                        <dd className="text-primary-900 mt-0.5 text-sm font-medium">
                          {spec.value}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>
              ) : null}

              <div className="mt-8 grid gap-2.5">
                <ButtonLink
                  href={`/quote?type=${encodeURIComponent(project.category.name)}&ref=${encodeURIComponent(project.title)}`}
                  size="lg"
                  fullWidth
                  icon="document"
                >
                  اطلب مشروعًا مشابهًا
                </ButtonLink>

                <ButtonLink
                  href={whatsappProjectUrl(project.title, `/portfolio/${project.slug}`)}
                  external
                  size="lg"
                  variant="whatsapp"
                  icon="whatsapp"
                  fullWidth
                >
                  استفسر عبر واتساب
                </ButtonLink>

                {project.relatedProduct ? (
                  <ButtonLink
                    href={`/shop/${project.relatedProduct.category.slug}/${project.relatedProduct.slug}`}
                    size="md"
                    variant="outline"
                    fullWidth
                  >
                    اطلب {project.relatedProduct.name} من المتجر
                  </ButtonLink>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {related.length > 0 ? (
        <Section tone="muted">
          <SectionHeading
            align="start"
            title={`أعمال أخرى في ${project.category.name}`}
            className="mb-8"
            action={
              <ButtonLink href="/portfolio" variant="outline" iconAfter="arrowLeft">
                كل الأعمال
              </ButtonLink>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.slice(0, 3).map((item) => (
              <li key={item.id}>
                <ProjectCard project={item} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}

type ProjectImage = {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
  stage: string;
};

function groupByStage(images: ProjectImage[]): Record<ProjectImageStage, ProjectImage[]> {
  const groups: Record<ProjectImageStage, ProjectImage[]> = {
    RESULT: [],
    BEFORE: [],
    AFTER: [],
    PROCESS: [],
  };

  for (const image of images) {
    const stage = (image.stage in groups ? image.stage : "RESULT") as ProjectImageStage;
    groups[stage].push(image);
  }

  return groups;
}
