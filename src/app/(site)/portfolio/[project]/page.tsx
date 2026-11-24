import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClosingCta } from "@/components/pages/ClosingCta";
import { MediaFrame } from "@/components/pages/MediaFrame";
import { PageSection } from "@/components/pages/PageSection";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
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

  // مشاريع مشابهة: من نفس القسم أولاً، ثم نكمل من بقية الأعمال
  const [sameCategory, everything] = await Promise.all([
    getProjects({ categorySlug: project.category.slug, limit: 6 }),
    getProjects({ limit: 9 }),
  ]);
  const similar = [...sameCategory, ...everything]
    .filter((item) => item.slug !== project.slug)
    .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index)
    .slice(0, 3);

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

  const quoteHref = `/quote?type=${encodeURIComponent(project.category.name)}&ref=${encodeURIComponent(project.title)}`;

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

      <section className="bg-surface py-10 md:py-16">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-3 lg:gap-14">
            {/* --- الصور --- */}
            <div className="lg:col-span-2">
              <div className="grid gap-4">
                {mainImages.length === 0 ? (
                  <MediaFrame
                    src={null}
                    alt={project.title}
                    icon="image"
                    ratio="4/3"
                    className="rounded-3xl"
                  />
                ) : (
                  mainImages.map((image, index) => (
                    <figure key={image.id}>
                      <MediaFrame
                        src={image.url}
                        alt={image.alt}
                        icon="image"
                        ratio="4/3"
                        priority={index === 0}
                        className="border-border shadow-card rounded-3xl border"
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

              {byStage.BEFORE.length > 0 || byStage.AFTER.length > 0 ? (
                <div className="mt-12">
                  <h2 className="mb-4 text-xl font-black">قبل وبعد</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(["BEFORE", "AFTER"] as const).map((stage) =>
                      byStage[stage].map((image) => (
                        <figure key={image.id}>
                          <MediaFrame
                            src={image.url}
                            alt={image.alt}
                            icon="image"
                            ratio="4/3"
                            className="rounded-2xl"
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

              {byStage.PROCESS.length > 0 ? (
                <div className="mt-12">
                  <h2 className="mb-4 text-xl font-black">مراحل التنفيذ</h2>
                  <ol className="grid gap-4 sm:grid-cols-3">
                    {byStage.PROCESS.map((image, index) => (
                      <li key={image.id}>
                        <figure>
                          <MediaFrame
                            src={image.url}
                            alt={image.alt}
                            icon="settings"
                            ratio="square"
                            className="rounded-2xl"
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
              <div className="lg:sticky lg:top-28">
                <Link
                  href={`/portfolio?category=${project.category.slug}`}
                  className="text-accent-700 hover:text-accent-800 mb-3 inline-flex items-center gap-2 text-sm font-bold transition-colors"
                >
                  <span aria-hidden="true" className="bg-accent-500 h-0.5 w-6 rounded-full" />
                  {project.category.name}
                </Link>

                <h1 className="text-[clamp(1.8rem,3vw,2.5rem)] leading-[1.15] font-black">
                  {project.title}
                </h1>

                {project.summary ? (
                  <p className="text-primary-600 mt-4 text-lg leading-relaxed">{project.summary}</p>
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
                          className="bg-surface-sunken text-primary-600 grid size-9 shrink-0 place-items-center rounded-lg"
                        >
                          <Icon name={spec.icon} className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <dt className="text-primary-500 text-xs">{spec.label}</dt>
                          <dd className="text-primary-900 mt-0.5 text-sm font-bold">
                            {spec.value}
                          </dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                ) : null}

                <div className="mt-8 grid gap-2.5">
                  <ButtonLink href={quoteHref} size="lg" variant="accent" fullWidth icon="document">
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
      </section>

      {similar.length > 0 ? (
        <PageSection
          tone="muted"
          eyebrow="مشاريع مشابهة"
          headingId="similar-title"
          title="أعمال أخرى قد تعجبك"
          action={
            <ButtonLink href="/portfolio" variant="outline" iconAfter="arrowLeft">
              كل الأعمال
            </ButtonLink>
          }
        >
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <li key={item.id}>
                <ProjectCard project={item} />
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      <ClosingCta
        title="أعجبك هذا العمل؟ نكرّره لك"
        description="أخبرنا بالمقاس والكمية وما تريد تغييره، ويصلك عرض سعر خلال يوم عمل."
        primary={{ label: "اطلب مشروعًا مشابهًا", href: quoteHref, icon: "document" }}
        secondary={{
          label: "واتساب",
          href: whatsappProjectUrl(project.title, `/portfolio/${project.slug}`),
          icon: "whatsapp",
          external: true,
        }}
      />
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
