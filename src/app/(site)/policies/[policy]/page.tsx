import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/site/PageHeader";
import { getPageBySlug } from "@/lib/queries";
import { Markdown } from "@/lib/markdown";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { formatDate, truncate } from "@/lib/utils";

/** الصفحات الثابتة المسموح عرضها تحت /policies — تمنع قراءة أي صفحة أخرى. */
const POLICY_SLUGS = ["privacy", "terms", "returns", "shipping"] as const;
type PolicySlug = (typeof POLICY_SLUGS)[number];

const RELATED: Record<PolicySlug, { label: string; href: string }[]> = {
  privacy: [
    { label: "الشروط والأحكام", href: "/policies/terms" },
    { label: "سياسة الاستبدال والاسترجاع", href: "/policies/returns" },
  ],
  terms: [
    { label: "سياسة الخصوصية", href: "/policies/privacy" },
    { label: "سياسة الاستبدال والاسترجاع", href: "/policies/returns" },
  ],
  returns: [
    { label: "الشروط والأحكام", href: "/policies/terms" },
    { label: "سياسة الشحن والتوصيل", href: "/policies/shipping" },
  ],
  shipping: [
    { label: "سياسة الاستبدال والاسترجاع", href: "/policies/returns" },
    { label: "الشروط والأحكام", href: "/policies/terms" },
  ],
};

type Params = Promise<{ policy: string }>;

export function generateStaticParams() {
  return POLICY_SLUGS.map((policy) => ({ policy }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { policy } = await params;
  if (!isPolicySlug(policy)) return { title: "الصفحة غير موجودة" };

  const page = await getPageBySlug(policy);
  if (!page) return { title: "الصفحة غير موجودة" };

  return {
    title: page.seoTitle ?? page.title,
    description: truncate(page.seoDescription ?? page.content, 160),
    alternates: { canonical: `/policies/${policy}` },
  };
}

export default async function PolicyPage({ params }: { params: Params }) {
  const { policy } = await params;
  if (!isPolicySlug(policy)) notFound();

  const page = await getPageBySlug(policy);
  if (!page) notFound();

  const crumbs = [{ label: page.title, href: `/policies/${policy}` }];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />

      <PageHeader tone="light" title={page.title} breadcrumbs={crumbs} />

      <div className="container-page py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-4 lg:gap-12">
          <article className="lg:col-span-3">
            <Markdown content={page.content} />

            <p className="text-primary-500 border-border mt-10 border-t pt-6 text-xs">
              آخر تحديث: {formatDate(page.updatedAt)}
            </p>
          </article>

          <aside className="lg:col-span-1">
            <nav
              aria-label="سياسات أخرى"
              className="border-border bg-surface-muted sticky top-24 rounded-xl border p-5"
            >
              <h2 className="mb-3 text-sm font-bold">سياسات ذات صلة</h2>
              <ul className="space-y-2">
                {RELATED[policy].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-primary-600 hover:text-accent-700 text-sm transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="border-border mt-5 border-t pt-5">
                <p className="text-primary-600 text-sm leading-relaxed">
                  لديك سؤال حول هذه السياسة؟
                </p>
                <Link
                  href="/contact"
                  className="text-accent-700 hover:text-accent-800 mt-2 inline-block text-sm font-bold transition-colors"
                >
                  تواصل معنا ←
                </Link>
              </div>
            </nav>
          </aside>
        </div>
      </div>
    </>
  );
}

function isPolicySlug(value: string): value is PolicySlug {
  return (POLICY_SLUGS as readonly string[]).includes(value);
}
