import type { Metadata } from "next";

import { PortfolioFilters } from "@/components/portfolio/PortfolioFilters";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProjectCategories, getProjects } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "معرض الأعمال",
  description:
    "مشاريع طباعة وتجهيزات دعائية نفّذناها لعملائنا: بوكسات وتغليف، أكواب، لوحات إعلانية، أكريليك، مطبوعات ورقية، استيكرات، هدايا دعائية، وطباعة ملابس — بخاماتها ومقاساتها وتفاصيل تنفيذها.",
  alternates: { canonical: "/portfolio" },
};

type SearchParams = Promise<{ category?: string }>;

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { category } = await searchParams;

  const [categories, projects, allProjects] = await Promise.all([
    getProjectCategories(),
    getProjects({ categorySlug: category }),
    getProjects(),
  ]);

  const activeCategory = categories.find((item) => item.slug === category);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ label: "معرض الأعمال", href: "/portfolio" }])} />

      <PageHeader
        eyebrow="معرض الأعمال"
        title={activeCategory ? `أعمال ${activeCategory.name}` : "مشاريع نفّذناها"}
        description="نماذج حقيقية من أعمال سلّمناها لعملائنا — لكل مشروع خاماته ومقاساته وتفاصيل تنفيذه. اطلب مشروعًا مشابهًا بضغطة واحدة."
        breadcrumbs={[{ label: "معرض الأعمال", href: "/portfolio" }]}
        action={
          <ButtonLink href="/quote" variant="accent" size="lg">
            اطلب مشروعًا مشابهًا
          </ButtonLink>
        }
      />

      <div className="container-page py-10 md:py-14">
        <PortfolioFilters
          categories={categories.map((item) => ({
            slug: item.slug,
            name: item.name,
            count: item._count.projects,
          }))}
          activeSlug={category}
          totalCount={allProjects.length}
        />

        {projects.length === 0 ? (
          <EmptyState
            icon="image"
            title={
              activeCategory
                ? `لم تُضَف أعمال في قسم ${activeCategory.name} بعد`
                : "معرض الأعمال قيد التجهيز"
            }
            description={
              activeCategory
                ? "ننفّذ هذا النوع من المشاريع فعليًا — تواصل معنا لعرض نماذج مباشرة قبل نشرها هنا."
                : "نجهّز حاليًا صور مشاريعنا المنفّذة ونضيفها تباعًا. حتى ذلك الحين، تواصل معنا وسنعرض عليك نماذج من أعمالنا مباشرة."
            }
            action={
              <>
                <ButtonLink href="/quote" size="lg">
                  اطلب عرض سعر
                </ButtonLink>
                <ButtonLink href="/services" size="lg" variant="outline">
                  تصفّح خدماتنا
                </ButtonLink>
              </>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <li key={project.id}>
                <ProjectCard project={project} priority={index < 3} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
