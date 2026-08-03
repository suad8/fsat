import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/shop/ProductCard";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, resolveIcon } from "@/components/ui/Icon";
import { Section, SectionHeading } from "@/components/ui/Section";
import { SmartImage } from "@/components/ui/SmartImage";
import { calculateStartingPrice, type PricingOptionGroup } from "@/lib/pricing";
import type { PriceMode } from "@/lib/constants";
import { getServiceBySlug, getServices } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd, serviceJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { truncate } from "@/lib/utils";
import { whatsappServiceUrl } from "@/lib/whatsapp";

type Params = Promise<{ service: string }>;

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ service: service.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { service: slug } = await params;
  const service = await getServiceBySlug(slug);

  if (!service) return { title: "الخدمة غير موجودة" };

  const description = service.seoDescription ?? service.shortDescription;

  return {
    title: service.seoTitle ?? service.title,
    description: truncate(description, 160),
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      title: service.title,
      description: truncate(description, 200),
      url: `/services/${service.slug}`,
      images: service.imageUrl ? [{ url: service.imageUrl }] : undefined,
    },
  };
}

export default async function ServicePage({ params }: { params: Params }) {
  const { service: slug } = await params;
  const [service, settings] = await Promise.all([getServiceBySlug(slug), getSettings()]);

  if (!service) notFound();

  const crumbs = [
    { label: "الخدمات", href: "/services" },
    { label: service.title, href: `/services/${service.slug}` },
  ];

  const highlights = Array.isArray(service.highlights)
    ? (service.highlights as string[])
    : [];

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

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          serviceJsonLd({
            title: service.title,
            description: service.description ?? service.shortDescription,
            slug: service.slug,
            settings,
          }),
        ]}
      />

      <PageHeader
        eyebrow="خدمة"
        title={service.title}
        description={service.shortDescription}
        breadcrumbs={crumbs}
        action={
          <ButtonLink
            href={`/quote?type=${encodeURIComponent(service.title)}`}
            variant="accent"
            size="lg"
          >
            اطلب هذه الخدمة
          </ButtonLink>
        }
      />

      <div className="container-page py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
          <div className="lg:col-span-2">
            <SmartImage
              src={service.imageUrl}
              alt={service.imageAlt ?? service.title}
              ratio="16/9"
              icon={resolveIcon(service.iconKey)}
              placeholderLabel={service.title}
              priority
              className="border-border mb-8 rounded-xl border"
              sizes="(max-width: 1024px) 100vw, 66vw"
            />

            {service.description ? (
              <div className="mb-9">
                <h2 className="mb-3 text-xl font-bold">تفاصيل الخدمة</h2>
                <p className="text-primary-700 leading-[1.9] whitespace-pre-line">
                  {service.description}
                </p>
              </div>
            ) : null}

            {highlights.length > 0 ? (
              <div>
                <h2 className="mb-4 text-xl font-bold">ما يميّز هذه الخدمة</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="border-border bg-surface-muted flex items-start gap-2.5 rounded-lg border p-3.5"
                    >
                      <Icon
                        name="check"
                        className="text-accent-600 mt-0.5 size-4 shrink-0"
                        strokeWidth={2.5}
                      />
                      <span className="text-primary-700 text-sm leading-relaxed">
                        {highlight}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {service.images.length > 0 ? (
              <div className="mt-10">
                <h2 className="mb-4 text-xl font-bold">نماذج من التنفيذ</h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {service.images.map((image) => (
                    <li key={image.id}>
                      <SmartImage
                        src={image.url}
                        alt={image.alt}
                        ratio="4/3"
                        icon={resolveIcon(service.iconKey)}
                        className="rounded-xl"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* --- بطاقة الطلب --- */}
          <aside className="lg:col-span-1">
            <div className="border-border bg-surface-muted sticky top-24 rounded-xl border p-6">
              <span
                aria-hidden="true"
                className="bg-primary-950 mb-4 grid size-12 place-items-center rounded-lg text-white"
              >
                <Icon name={resolveIcon(service.iconKey)} className="size-6" />
              </span>

              <h2 className="text-lg font-bold">اطلب {service.title}</h2>

              <p className="text-primary-600 mt-2.5 text-sm leading-relaxed">
                أرسل لنا مواصفات ما تحتاجه — النوع، المقاس، الكمية — وسيصلك عرض سعر
                دقيق ومدة تنفيذ محددة خلال يوم عمل.
              </p>

              <div className="mt-6 grid gap-2.5">
                <ButtonLink
                  href={`/quote?type=${encodeURIComponent(service.title)}`}
                  size="lg"
                  fullWidth
                  icon="document"
                >
                  طلب عرض سعر
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

                {products.length > 0 ? (
                  <ButtonLink href="#products" size="md" variant="outline" fullWidth>
                    منتجات هذه الخدمة
                  </ButtonLink>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* --- المنتجات المرتبطة --- */}
      <Section id="products" tone="muted">
        <SectionHeading
          align="start"
          title="منتجات ضمن هذه الخدمة"
          description="اطلبها مباشرة من المتجر بأسعار محسوبة حسب مواصفاتك وكميتك."
          className="mb-8"
        />

        {products.length === 0 ? (
          <EmptyState
            icon="package"
            compact
            title="لا توجد منتجات جاهزة لهذه الخدمة في المتجر"
            description="تُنفَّذ هذه الخدمة حسب مواصفات كل مشروع. أرسل تفاصيل طلبك ونرسل لك عرض سعر."
            action={
              <ButtonLink
                href={`/quote?type=${encodeURIComponent(service.title)}`}
                variant="accent"
              >
                اطلب عرض سعر
              </ButtonLink>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
