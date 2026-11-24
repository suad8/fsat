import type { Metadata } from "next";
import Link from "next/link";

import { ClosingCta } from "@/components/pages/ClosingCta";
import { PageSection } from "@/components/pages/PageSection";
import { PortfolioGallery } from "@/components/portfolio/PortfolioGallery";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, resolveIcon } from "@/components/ui/Icon";
import { getProjectCategories, getProjects, getServices } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { whatsappGeneralUrl, whatsappProjectUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "معرض الأعمال",
  description:
    "مشاريع طباعة وتجهيزات دعائية نفّذناها: بوكسات وتغليف، أكواب، لوحات، أكريليك، مطبوعات، استيكرات وهدايا — بخاماتها ومقاساتها. اطلب مشروعًا مشابهًا.",
  alternates: { canonical: "/portfolio" },
};

type SearchParams = Promise<{ category?: string }>;

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { category } = await searchParams;

  const [categories, projects, services] = await Promise.all([
    getProjectCategories(),
    getProjects(),
    getServices(),
  ]);

  const hasProjects = projects.length > 0;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ label: "معرض الأعمال", href: "/portfolio" }])} />

      <PageHeader
        eyebrow="معرض الأعمال"
        title={hasProjects ? "أعمال نفّذناها بأيدينا" : "معرض أعمالنا قيد التجهيز"}
        description={
          hasProjects
            ? "لكل مشروع خاماته ومقاساته وتفاصيل تنفيذه. أعجبك عمل؟ اطلب مشروعًا مشابهًا بضغطة واحدة."
            : "نجهّز صور المشاريع المنفّذة لنعرضها بما يليق بها. وحتى ذلك الحين، أخبرنا بمشروعك وسنوضّح لك الخامات والتشطيبات المتاحة له."
        }
        breadcrumbs={[{ label: "معرض الأعمال", href: "/portfolio" }]}
        action={
          <ButtonLink href="/quote" variant="accent" size="lg" iconAfter="arrowLeft">
            {hasProjects ? "اطلب مشروعًا مشابهًا" : "اطلب عرض سعر"}
          </ButtonLink>
        }
      />

      {hasProjects ? (
        <>
          <PageSection className="pt-12 md:pt-16">
            <PortfolioGallery
              initialCategory={category}
              categories={categories.map((item) => ({ slug: item.slug, name: item.name }))}
              projects={projects.map((project) => ({
                id: project.id,
                slug: project.slug,
                title: project.title,
                summary: project.summary,
                materials: project.materials,
                dimensions: project.dimensions,
                categorySlug: project.category.slug,
                categoryName: project.category.name,
                imageUrl: project.images[0]?.url ?? null,
                imageAlt: project.images[0]?.alt ?? project.title,
                whatsappUrl: whatsappProjectUrl(project.title, `/portfolio/${project.slug}`),
              }))}
            />
          </PageSection>

          <ClosingCta
            title="لديك مشروع بنفس الروح؟"
            description="أرسل لنا الفكرة والمقاس والكمية، ونرد عليك بعرض سعر ومدة تنفيذ خلال يوم عمل."
            primary={{ label: "اطلب مشروعًا مشابهًا", href: "/quote", icon: "document" }}
            secondary={{
              label: "واتساب",
              href: whatsappGeneralUrl("/portfolio"),
              icon: "whatsapp",
              external: true,
            }}
          />
        </>
      ) : (
        /* حالة فارغة مقصودة: رسالة صادقة + ما ننفّذه + دعوة واحدة، لا صفحة ناقصة */
        <section className="bg-surface-muted py-14 md:py-20">
          <div className="container-page">
            <div className="border-border bg-surface shadow-card mx-auto max-w-4xl overflow-hidden rounded-3xl border">
              <div className="px-6 py-12 text-center md:px-14 md:py-16">
                <span
                  aria-hidden="true"
                  className="bg-ink text-accent-400 mx-auto mb-6 grid size-16 place-items-center rounded-2xl"
                >
                  <Icon name="image" className="size-8" strokeWidth={1.3} />
                </span>
                <h2 className="text-2xl leading-snug font-black md:text-3xl">
                  نضيف أعمالنا تباعًا
                </h2>
                <p className="text-primary-600 mx-auto mt-4 max-w-xl leading-[1.9]">
                  عند رفع صور المشاريع ستظهر هنا مصنّفة بخاماتها ومقاساتها. إن كان
                  لديك مشروع الآن فلا داعي للانتظار: اطلب عرض سعر، وسنقترح عليك الخامة
                  والتشطيب المناسبين.
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <ButtonLink href="/quote" size="lg" variant="accent" icon="document">
                    اطلب عرض سعر
                  </ButtonLink>
                  <ButtonLink
                    href={whatsappGeneralUrl("/portfolio")}
                    external
                    size="lg"
                    variant="whatsapp"
                    icon="whatsapp"
                  >
                    تواصل عبر واتساب
                  </ButtonLink>
                </div>
              </div>

              {services.length > 0 ? (
                <div className="border-border bg-surface-muted border-t px-6 py-8 md:px-14">
                  <h3 className="text-primary-800 mb-4 text-center text-sm font-bold">
                    ما يمكننا تنفيذه لك
                  </h3>
                  <ul className="flex flex-wrap justify-center gap-2.5">
                    {services.map((service) => (
                      <li key={service.id}>
                        <Link
                          href={`/services/${service.slug}`}
                          className="border-border-strong bg-surface text-primary-800 hover:border-accent-600 hover:text-accent-800 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors"
                        >
                          <Icon
                            name={resolveIcon(service.iconKey)}
                            className="text-accent-700 size-4"
                          />
                          {service.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
