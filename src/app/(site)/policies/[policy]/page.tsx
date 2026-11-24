import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClosingCta } from "@/components/pages/ClosingCta";
import { PolicyToc, type TocItem } from "@/components/pages/PolicyToc";
import { PageHeader } from "@/components/site/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { NEEDS_BRAND_FILE } from "@/config/brand";
import { getPageBySlug } from "@/lib/queries";
import { Markdown } from "@/lib/markdown";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { formatDate, truncate } from "@/lib/utils";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

/** الصفحات الثابتة المسموح عرضها تحت /policies — تمنع قراءة أي صفحة أخرى. */
const POLICY_SLUGS = ["privacy", "terms", "returns", "shipping"] as const;
type PolicySlug = (typeof POLICY_SLUGS)[number];

const POLICY_TITLES: Record<PolicySlug, string> = {
  privacy: "سياسة الخصوصية",
  terms: "الشروط والأحكام",
  returns: "سياسة الاستبدال والاسترجاع",
  shipping: "سياسة الشحن والتوصيل",
};

type Params = Promise<{ policy: string }>;

export function generateStaticParams() {
  return POLICY_SLUGS.map((policy) => ({ policy }));
}

/**
 * ينظّف النص قبل عرضه للعميل: أي سطر يحمل وسم «يحتاج استبدال» هو ملاحظة
 * داخلية للإدارة (مثل «مسوّدة تحتاج مراجعة قانونية») ولا يُعرض للزائر.
 */
function publicContent(content: string): string {
  return content
    .split("\n")
    .filter((line) => !line.includes(NEEDS_BRAND_FILE))
    .join("\n")
    .trim();
}

/** يقسم النص عند عناوين المستوى الثاني ليصبح لكل قسم مرساة ثابتة للفهرس. */
function splitSections(content: string): { intro: string; sections: { id: string; title: string; body: string }[] } {
  const lines = content.split("\n");
  const introLines: string[] = [];
  const sections: { id: string; title: string; body: string[] }[] = [];

  for (const line of lines) {
    const heading = /^##\s+(.+)$/.exec(line.trim());
    if (heading) {
      sections.push({ id: `section-${sections.length + 1}`, title: heading[1].trim(), body: [line] });
    } else if (sections.length > 0) {
      sections[sections.length - 1].body.push(line);
    } else {
      introLines.push(line);
    }
  }

  return {
    intro: introLines.join("\n").trim(),
    sections: sections.map((section) => ({ ...section, body: section.body.join("\n") })),
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { policy } = await params;
  if (!isPolicySlug(policy)) return { title: "الصفحة غير موجودة" };

  const page = await getPageBySlug(policy);
  if (!page) return { title: "الصفحة غير موجودة" };

  return {
    title: page.seoTitle ?? page.title,
    description: truncate(page.seoDescription ?? publicContent(page.content), 160),
    alternates: { canonical: `/policies/${policy}` },
  };
}

export default async function PolicyPage({ params }: { params: Params }) {
  const { policy } = await params;
  if (!isPolicySlug(policy)) notFound();

  const page = await getPageBySlug(policy);
  if (!page) notFound();

  const crumbs = [{ label: page.title, href: `/policies/${policy}` }];

  const content = publicContent(page.content);
  const { intro, sections } = splitSections(content);
  const toc: TocItem[] = sections.map((section) => ({ id: section.id, title: section.title }));

  // وقت القراءة التقريبي (٢٠٠ كلمة في الدقيقة)
  const words = content.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));

  const others = POLICY_SLUGS.filter((slug) => slug !== policy);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />

      <PageHeader
        compact
        eyebrow="السياسات"
        title={page.title}
        description={`آخر تحديث: ${formatDate(page.updatedAt)} · قراءة ${minutes} ${minutes === 1 ? "دقيقة" : "دقائق"}`}
        breadcrumbs={crumbs}
      />

      <section className="bg-surface py-10 md:py-16">
        <div className="container-page">
          <div className="grid gap-8 lg:grid-cols-4 lg:gap-14">
            {/* --- الفهرس --- */}
            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-28">
                {toc.length > 0 ? (
                  <>
                    {/* جوال: مطوي */}
                    <details className="border-border bg-surface-muted rounded-2xl border lg:hidden">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black">
                        محتويات الصفحة
                        <Icon name="chevronDown" className="text-primary-400 size-4" />
                      </summary>
                      <nav aria-label="محتويات الصفحة" className="border-border border-t p-2">
                        <PolicyToc items={toc} />
                      </nav>
                    </details>

                    {/* سطح المكتب: ظاهر وثابت */}
                    <nav
                      aria-label="محتويات الصفحة"
                      className="border-border bg-surface-muted hidden rounded-2xl border p-3 lg:block"
                    >
                      <h2 className="text-primary-500 px-3 pt-1.5 pb-2 text-xs font-bold">
                        محتويات الصفحة
                      </h2>
                      <PolicyToc items={toc} />
                    </nav>
                  </>
                ) : null}

                <nav aria-label="سياسات أخرى" className="mt-5 hidden lg:block">
                  <h2 className="text-primary-500 mb-2 px-1 text-xs font-bold">سياسات أخرى</h2>
                  <ul className="space-y-1">
                    {others.map((slug) => (
                      <li key={slug}>
                        <Link
                          href={`/policies/${slug}`}
                          className="text-primary-600 hover:text-accent-800 flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm transition-colors"
                        >
                          <Icon name="chevronLeft" className="size-3.5" />
                          {POLICY_TITLES[slug]}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </aside>

            {/* --- النص --- */}
            <article className="max-w-3xl lg:col-span-3">
              {intro ? (
                <div className="mb-10 text-lg">
                  <Markdown content={intro} />
                </div>
              ) : null}

              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="border-border scroll-mt-28 border-t py-8 first:border-t-0 first:pt-0"
                >
                  <Markdown content={section.body} />
                </section>
              ))}

              <p className="text-primary-500 border-border mt-6 flex items-center gap-2 border-t pt-6 text-sm">
                <Icon name="clock" className="size-4" />
                آخر تحديث: {formatDate(page.updatedAt)}
              </p>

              <nav aria-label="سياسات أخرى" className="mt-6 lg:hidden">
                <h2 className="text-primary-500 mb-2 text-xs font-bold">سياسات أخرى</h2>
                <ul className="space-y-1">
                  {others.map((slug) => (
                    <li key={slug}>
                      <Link
                        href={`/policies/${slug}`}
                        className="text-accent-800 inline-flex min-h-10 items-center text-sm font-bold"
                      >
                        {POLICY_TITLES[slug]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </article>
          </div>
        </div>
      </section>

      <ClosingCta
        title="لديك سؤال عن هذه السياسة؟"
        description="اكتب لنا وسنوضّح لك أي نقطة قبل أن تطلب."
        primary={{
          label: "تواصل عبر واتساب",
          href: whatsappGeneralUrl(`/policies/${policy}`),
          icon: "whatsapp",
          external: true,
        }}
        secondary={{ label: "صفحة اتصل بنا", href: "/contact" }}
      />
    </>
  );
}

function isPolicySlug(value: string): value is PolicySlug {
  return (POLICY_SLUGS as readonly string[]).includes(value);
}
