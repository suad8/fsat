import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClosingCta } from "@/components/pages/ClosingCta";
import { MediaFrame } from "@/components/pages/MediaFrame";
import { PageSection } from "@/components/pages/PageSection";
import { keywordsOf, normalizeArabic, summarizeLeadTimes } from "@/components/pages/arabic";
import { audienceFor } from "@/components/pages/insights";
import { ProductCard } from "@/components/shop/ProductCard";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, resolveIcon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import type { PriceMode } from "@/lib/constants";
import { calculateStartingPrice, type PricingOptionGroup } from "@/lib/pricing";
import { getFaqs, getServiceBySlug, getServices } from "@/lib/queries";
import { breadcrumbJsonLd, faqJsonLd, JsonLd, serviceJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { absoluteUrl, truncate } from "@/lib/utils";
import { whatsappServiceUrl } from "@/lib/whatsapp";

type Params = Promise<{ service: string }>;

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ service: service.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { service: slug } = await params;
  const [service, settings] = await Promise.all([getServiceBySlug(slug), getSettings()]);

  if (!service) return { title: "الخدمة غير موجودة" };

  const description = service.seoDescription ?? service.shortDescription;

  // عنوان محلي: «الخدمة في المدينة» ما لم تحدّد الإدارة عنوانًا خاصًا
  const title = service.seoTitle ?? `${service.title} في ${settings.city}`;

  return {
    title,
    description: truncate(description, 160),
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      title,
      description: truncate(description, 200),
      url: `/services/${service.slug}`,
      images: service.imageUrl ? [{ url: service.imageUrl }] : undefined,
    },
  };
}

/** أسئلة مرتبطة بالخدمة: تطابق كلمات عنوانها، أو من أقسام تهمّ كل خدمة. */
function relatedFaqs<T extends { question: string; category: string | null }>(
  faqs: T[],
  title: string,
): T[] {
  const keywords = keywordsOf(title);
  const GENERAL = new Set(["التصميم", "التنفيذ", "الكميات"]);

  const scored = faqs
    .map((faq) => {
      const question = normalizeArabic(faq.question);
      const direct = keywords.some((word) => question.includes(word));
      const general = faq.category ? GENERAL.has(faq.category) : false;
      return { faq, score: direct ? 2 : general ? 1 : 0 };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 5).map((entry) => entry.faq);
}

export default async function ServicePage({ params }: { params: Params }) {
  const { service: slug } = await params;
  const [service, settings, faqs, allServices] = await Promise.all([
    getServiceBySlug(slug),
    getSettings(),
    getFaqs(),
    getServices(),
  ]);

  if (!service) notFound();

  const crumbs = [
    { label: "الخدمات", href: "/services" },
    { label: service.title, href: `/services/${service.slug}` },
  ];

  const highlights = Array.isArray(service.highlights)
    ? (service.highlights as string[])
    : [];

  const audience = audienceFor(service.iconKey);
  const icon = resolveIcon(service.iconKey);
  const quoteHref = `/quote?type=${encodeURIComponent(service.title)}&from=service`;

  // بطاقات المنتجات تحتاج حساب "يبدأ من" — نفس التحويل المستخدم في المتجر
  const products = service.products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    priceMode: product.priceMode as PriceMode,
    compareAtPrice: product.compareAtPrice,
    unit: product.unit,
    minQuantity: product.minQuantity,
    leadTime: product.leadTime,
    isFeatured: product.isFeatured,
    categorySlug: product.category.slug,
    categoryName: product.category.name,
    categoryIcon: product.category.iconKey,
    imageUrl: product.images[0]?.url ?? null,
    imageAlt: product.images[0]?.alt ?? product.name,
    startingPrice: calculateStartingPrice({
      priceMode: product.priceMode as PriceMode,
      basePrice: product.basePrice,
      minQuantity: product.minQuantity,
      quantityStep: product.quantityStep,
      quantityTiers: product.quantityTiers,
      optionGroups: product.optionGroups as unknown as PricingOptionGroup[],
    }),
    href: `/shop/${product.category.slug}/${product.slug}`,
  }));

  const leadTime = summarizeLeadTimes(products.map((product) => product.leadTime));
  const faqItems = relatedFaqs(faqs, service.title);
  const otherServices = allServices.filter((item) => item.slug !== service.slug).slice(0, 6);

  const facts = [
    {
      icon: "clock" as const,
      label: "المدة المعتادة",
      value: leadTime ?? "تُحدَّد في عرض السعر",
      hint: leadTime ? "تختلف حسب المنتج والكمية" : "حسب مواصفات طلبك وكميته",
    },
    {
      icon: "package" as const,
      label: "منتجات جاهزة للطلب",
      value: products.length > 0 ? `${products.length}` : "حسب الطلب",
      hint: products.length > 0 ? "سعرها يظهر أمامك في المتجر" : "تُنفَّذ بمواصفات مشروعك",
    },
    {
      icon: "document" as const,
      label: "الرد على عرض السعر",
      value: "خلال يوم عمل",
      hint: "بسعر ومدة تنفيذ محددين",
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          {
            ...serviceJsonLd({
              title: service.title,
              description: service.description ?? service.shortDescription,
              slug: service.slug,
              settings,
            }),
            areaServed: [
              { "@type": "City", name: settings.city },
              { "@type": "Country", name: "المملكة العربية السعودية" },
            ],
            ...(products.length > 0
              ? {
                  hasOfferCatalog: {
                    "@type": "OfferCatalog",
                    name: service.title,
                    itemListElement: products.map((product) => ({
                      "@type": "Offer",
                      itemOffered: {
                        "@type": "Product",
                        name: product.name,
                        url: absoluteUrl(product.href),
                      },
                    })),
                  },
                }
              : {}),
          },
          ...(faqItems.length > 0
            ? [faqJsonLd(faqItems.map((faq) => ({ question: faq.question, answer: faq.answer })))]
            : []),
        ]}
      />

      <PageHeader
        eyebrow="خدمة"
        title={`${service.title} في ${settings.city}`}
        description={service.shortDescription}
        breadcrumbs={crumbs}
        action={
          <ButtonLink href={quoteHref} variant="accent" size="lg" iconAfter="arrowLeft">
            اطلب عرض سعر لهذه الخدمة
          </ButtonLink>
        }
      />

      {/* --- حقائق سريعة تجيب «كم المدة؟ وكيف أطلب؟» --- */}
      <section aria-label="ملخص الخدمة" className="bg-surface border-border border-b">
        <div className="container-page">
          <dl className="divide-border grid divide-y md:grid-cols-3 md:divide-x md:divide-x-reverse md:divide-y-0">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-start gap-4 px-2 py-5 md:px-8 md:py-7">
                <span
                  aria-hidden="true"
                  className="bg-accent-50 text-accent-700 ring-accent-600/15 grid size-11 shrink-0 place-items-center rounded-xl ring-1"
                >
                  <Icon name={fact.icon} className="size-5" />
                </span>
                <div className="min-w-0">
                  <dt className="text-primary-500 text-xs font-medium">{fact.label}</dt>
                  <dd className="text-primary-950 mt-1 text-lg leading-snug font-black">
                    {fact.value}
                    <span className="text-primary-500 mt-0.5 block text-xs font-normal">
                      {fact.hint}
                    </span>
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* --- التفاصيل + بطاقة الطلب --- */}
      <section className="bg-surface py-14 md:py-20">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-3 lg:gap-14">
            <div className="space-y-12 lg:col-span-2">
              {service.imageUrl ? (
                <MediaFrame
                  src={service.imageUrl}
                  alt={service.imageAlt ?? service.title}
                  icon={icon}
                  ratio="16/10"
                  priority
                  className="border-border shadow-card rounded-2xl border"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
              ) : null}

              {service.description ? (
                <div>
                  <h2 className="mb-4 text-2xl font-black md:text-3xl">عن الخدمة</h2>
                  <p className="text-primary-700 text-base leading-[2] whitespace-pre-line md:text-lg">
                    {service.description}
                  </p>
                </div>
              ) : null}

              {highlights.length > 0 ? (
                <div>
                  <h2 className="mb-5 text-2xl font-black md:text-3xl">ماذا تشمل؟</h2>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="border-border bg-surface-muted flex items-start gap-3 rounded-xl border p-4"
                      >
                        <span
                          aria-hidden="true"
                          className="bg-ink text-accent-400 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full"
                        >
                          <Icon name="check" className="size-3.5" strokeWidth={2.5} />
                        </span>
                        <span className="text-primary-800 text-sm leading-relaxed font-medium">
                          {highlight}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {audience ? (
                <div className="border-accent-600/20 bg-accent-50/60 rounded-2xl border p-6 md:p-7">
                  <h2 className="flex items-center gap-2.5 text-lg font-black">
                    <Icon name="users" className="text-accent-700 size-5" />
                    لمن تناسب هذه الخدمة؟
                  </h2>
                  <p className="text-primary-700 mt-3 leading-[1.9]">{audience}</p>
                </div>
              ) : null}

              {service.images.length > 0 ? (
                <div>
                  <h2 className="mb-5 text-2xl font-black md:text-3xl">نماذج من التنفيذ</h2>
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {service.images.map((image) => (
                      <li key={image.id}>
                        <MediaFrame
                          src={image.url}
                          alt={image.alt}
                          icon={icon}
                          ratio="4/3"
                          className="border-border rounded-2xl border"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* --- بطاقة الطلب --- */}
            <aside className="lg:col-span-1">
              <div className="bg-ink grain shadow-pop relative overflow-hidden rounded-3xl p-7 text-white lg:sticky lg:top-28">
                <div
                  aria-hidden="true"
                  className="halftone halftone-fade pointer-events-none absolute inset-0 text-white/[0.06]"
                />
                <div
                  aria-hidden="true"
                  className="bg-accent-500/25 pointer-events-none absolute -top-16 -end-16 size-48 rounded-full blur-[70px]"
                />

                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="text-accent-400 mb-5 grid size-12 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15"
                  >
                    <Icon name={icon} className="size-6" />
                  </span>

                  <h2 className="text-xl leading-snug font-black text-white">
                    اطلب عرض سعر لهذه الخدمة
                  </h2>

                  <p className="text-primary-300 mt-3 text-sm leading-relaxed">
                    اختر النوع واذكر المقاس والكمية، ونرد عليك بسعر ومدة تنفيذ واضحين خلال
                    يوم عمل. نعبّئ لك اسم الخدمة مسبقًا.
                  </p>

                  <div className="mt-6 grid gap-2.5">
                    <ButtonLink href={quoteHref} size="lg" variant="accent" fullWidth icon="document">
                      اطلب عرض سعر
                    </ButtonLink>
                    <ButtonLink
                      href={whatsappServiceUrl(service.title, `/services/${service.slug}`)}
                      external
                      size="lg"
                      variant="whatsapp"
                      icon="whatsapp"
                      fullWidth
                    >
                      استفسر عبر واتساب
                    </ButtonLink>
                  </div>

                  {products.length > 0 ? (
                    <Link
                      href="#products"
                      className="text-primary-300 hover:text-white mt-5 inline-flex items-center gap-1.5 text-sm font-bold transition-colors"
                    >
                      أو اطلب منتجًا جاهزًا من المتجر
                      <Icon name="arrowLeft" className="size-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* --- المنتجات المرتبطة (تُحذف كاملة إن لم توجد) --- */}
      {products.length > 0 ? (
        <PageSection
          id="products"
          tone="muted"
          eyebrow="من المتجر"
          headingId="products-title"
          title="منتجات ضمن هذه الخدمة"
          description="اطلبها مباشرة بسعر محسوب حسب مواصفاتك وكميتك."
          action={
            <ButtonLink href="/shop" variant="outline" iconAfter="arrowLeft">
              كل المنتجات
            </ButtonLink>
          }
        >
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {/* --- أسئلة مرتبطة --- */}
      {faqItems.length > 0 ? (
        <PageSection
          eyebrow="أسئلة قبل أن تطلب"
          headingId="faq-title"
          title={`أسئلة شائعة عن ${service.title}`}
          action={
            <ButtonLink href="/faq" variant="outline" iconAfter="arrowLeft">
              كل الأسئلة
            </ButtonLink>
          }
        >
          <ul className="mx-auto max-w-3xl space-y-3">
            {faqItems.map((faq) => (
              <li key={faq.id}>
                <details className="group border-border bg-surface hover:border-border-strong rounded-xl border transition-colors open:shadow-card">
                  <summary className="focus-visible:outline-accent-600 flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-bold focus-visible:outline-2 focus-visible:-outline-offset-2">
                    <span className="text-sm md:text-base">{faq.question}</span>
                    <Icon
                      name="chevronDown"
                      className="text-primary-400 size-5 shrink-0 transition-transform duration-300 group-open:rotate-180"
                    />
                  </summary>
                  <div className="border-border border-t px-5 py-4">
                    <p className="text-primary-700 text-sm leading-[1.9]">{faq.answer}</p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {/* --- خدمات أخرى: روابط داخلية --- */}
      {otherServices.length > 0 ? (
        <PageSection
          tone={faqItems.length > 0 || products.length === 0 ? "muted" : "default"}
          eyebrow="خدمات أخرى"
          headingId="more-title"
          title="قد يهمّك أيضًا"
        >
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {otherServices.map((item) => (
              <Reveal as="li" key={item.id}>
                <Link
                  href={`/services/${item.slug}`}
                  className="group border-border bg-surface hover:border-accent-500/60 hover:shadow-card flex items-center gap-3.5 rounded-xl border p-4 transition-[border-color,box-shadow]"
                >
                  <span
                    aria-hidden="true"
                    className="bg-surface-sunken text-primary-700 group-hover:bg-ink group-hover:text-accent-400 grid size-11 shrink-0 place-items-center rounded-lg transition-colors"
                  >
                    <Icon name={resolveIcon(item.iconKey)} className="size-5" />
                  </span>
                  <span className="text-primary-900 min-w-0 flex-1 text-sm leading-snug font-bold">
                    {item.title}
                  </span>
                  <Icon
                    name="arrowLeft"
                    className="text-primary-300 group-hover:text-accent-700 size-4 transition-transform group-hover:-translate-x-1"
                  />
                </Link>
              </Reveal>
            ))}
          </ul>
        </PageSection>
      ) : null}

      <ClosingCta
        title={`جاهز لطلب ${service.title}؟`}
        description="أرسل المواصفات التقريبية ويصلك عرض سعر ومدة تنفيذ خلال يوم عمل."
        primary={{ label: "اطلب عرض سعر لهذه الخدمة", href: quoteHref, icon: "document" }}
        secondary={{
          label: "واتساب",
          href: whatsappServiceUrl(service.title, `/services/${service.slug}`),
          icon: "whatsapp",
          external: true,
        }}
      />
    </>
  );
}
