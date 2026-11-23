import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/shop/ProductCard";
import {
  ProductConfigurator,
  type ConfiguratorGroup,
} from "@/components/shop/ProductConfigurator";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { brand, commerce } from "@/config/brand";
import type { PriceMode } from "@/lib/constants";
import { calculateStartingPrice } from "@/lib/pricing";
import { getProductBySlug, getProducts, getRelatedProducts } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd, productJsonLd } from "@/lib/seo";
import { formatNumber, truncate } from "@/lib/utils";

type Params = Promise<{ category: string; product: string }>;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({
    category: product.categorySlug,
    product: product.slug,
  }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { product: slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "المنتج غير موجود" };

  const description =
    product.seoDescription ?? product.shortDescription ?? product.description ?? "";
  const canonical = `/shop/${product.category.slug}/${product.slug}`;

  return {
    title: product.seoTitle ?? product.name,
    description: truncate(description, 160),
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: product.name,
      description: truncate(description, 200),
      url: canonical,
      images: product.images[0]
        ? [{ url: product.images[0].url, alt: product.images[0].alt }]
        : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { product: slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const related = await getRelatedProducts(product.category.slug, product.slug, 4);

  const crumbs = [
    { label: "المتجر", href: "/shop" },
    { label: product.category.name, href: `/shop/${product.category.slug}` },
    { label: product.name, href: `/shop/${product.category.slug}/${product.slug}` },
  ];

  const groups = product.optionGroups as unknown as ConfiguratorGroup[];

  const startingPrice = calculateStartingPrice({
    priceMode: product.priceMode as PriceMode,
    basePrice: product.basePrice,
    minQuantity: product.minQuantity,
    quantityStep: product.quantityStep,
    quantityTiers: product.quantityTiers,
    optionGroups: groups,
  });

  const about = (
    <>
            {product.description ? (
              <div className="mt-10">
                <h2 className="mb-3 text-lg font-bold">عن هذا المنتج</h2>
                <p className="text-primary-700 leading-[1.9] whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            ) : null}

            {product.services.length > 0 ? (
              <div className="border-border mt-8 border-t pt-6">
                <h2 className="text-primary-800 mb-3 text-sm font-bold">
                  ضمن خدماتنا
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {product.services.map((service) => (
                    <li key={service.slug}>
                      <Link
                        href={`/services/${service.slug}`}
                        className="border-border-strong text-primary-700 hover:border-accent-600 hover:text-accent-700 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors"
                      >
                        {service.title}
                        <Icon name="arrowLeft" className="size-3" strokeWidth={2.5} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
    </>
  );

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          productJsonLd({
            name: product.name,
            description: product.shortDescription ?? product.description,
            slug: product.slug,
            categorySlug: product.category.slug,
            imageUrl: product.images[0]?.url ?? null,
            price: startingPrice,
            currency: commerce.currency,
            sku: product.sku,
            brandName: brand.name,
            inStock: product.priceMode !== "QUOTE_ONLY",
          }),
        ]}
      />

      <div className="border-border bg-surface-muted border-b">
        <div className="container-page py-3">
          <Breadcrumbs items={crumbs} />
        </div>
      </div>

      {/* pb كبير على الجوال ليفسح مكانًا للشريط السفلي الثابت */}
      <div className="container-page py-8 pb-28 md:py-12 md:pb-12">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          {/* --- الصور والوصف: تبقى الصورة ظاهرة أثناء مرور العميل على الخيارات --- */}
          <div className="lg:sticky lg:top-24">
            <ProductGallery
              images={product.images.map((image) => ({
                id: image.id,
                url: image.url,
                alt: image.alt,
              }))}
              productName={product.name}
              categoryIcon={product.category.iconKey}
            />

            {/* الوصف تحت الصورة على الشاشات الكبيرة، وبعد الخيارات على الجوال */}
            <div className="hidden lg:block">{about}</div>
          </div>

          {/* --- المُهيّئ --- */}
          <div>
            <div className="mb-6">
              <Link
                href={`/shop/${product.category.slug}`}
                className="text-accent-700 hover:text-accent-800 mb-2.5 inline-block text-xs font-bold transition-colors"
              >
                {product.category.name}
              </Link>

              <h1 className="text-3xl leading-tight font-black md:text-4xl">{product.name}</h1>

              {product.shortDescription ? (
                <p className="text-primary-600 mt-3 leading-relaxed">
                  {product.shortDescription}
                </p>
              ) : null}

              {/* الحقائق الثلاث التي يسأل عنها كل عميل قبل أي شيء */}
              <Reveal>
                <dl className="border-border bg-surface shadow-card mt-6 grid grid-cols-3 divide-x divide-x-reverse divide-[var(--color-border)] overflow-hidden rounded-2xl border">
                  <Fact label="السعر">
                    {product.priceMode === "QUOTE_ONLY" || startingPrice === null ? (
                      <span className="text-accent-800 text-sm font-extrabold md:text-base">
                        بعرض سعر
                      </span>
                    ) : (
                      <Price
                        value={startingPrice}
                        size="md"
                        startsFrom={product.priceMode === "STARTS_FROM"}
                      />
                    )}
                  </Fact>
                  <Fact label="الحد الأدنى">
                    <span className="text-sm font-extrabold md:text-base">
                      {formatNumber(product.minQuantity)} {product.unit}
                    </span>
                  </Fact>
                  <Fact label="مدة التنفيذ">
                    <span className="text-sm font-extrabold md:text-base">
                      {product.leadTime ?? "حسب الطلب"}
                    </span>
                  </Fact>
                </dl>
              </Reveal>

              <ul className="mt-5 flex flex-wrap gap-2">
                {product.sku ? (
                  <li>
                    <Badge icon="tag">رمز المنتج: {product.sku}</Badge>
                  </li>
                ) : null}
                {product.priceMode === "QUOTE_ONLY" ? (
                  <li>
                    <Badge tone="accent" icon="document">
                      يُسعَّر بعرض سعر
                    </Badge>
                  </li>
                ) : null}
              </ul>
            </div>

            <ProductConfigurator
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                unit: product.unit,
                categorySlug: product.category.slug,
                imageUrl: product.images[0]?.url ?? null,
                priceMode: product.priceMode as PriceMode,
                basePrice: product.basePrice,
                compareAtPrice: product.compareAtPrice,
                minQuantity: product.minQuantity,
                quantityStep: product.quantityStep,
                leadTime: product.leadTime,
                optionGroups: groups,
                quantityTiers: product.quantityTiers,
              }}
            />
            <div className="lg:hidden">{about}</div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              {TRUST.map((item) => (
                <li
                  key={item.title}
                  className="bg-surface-muted flex items-start gap-3 rounded-2xl p-4"
                >
                  <span
                    aria-hidden="true"
                    className="bg-ink text-accent-400 grid size-9 shrink-0 place-items-center rounded-xl"
                  >
                    <Icon name={item.icon} className="size-[1.1rem]" strokeWidth={1.7} />
                  </span>
                  <span className="text-xs leading-relaxed">
                    <b className="text-primary-950 block text-sm">{item.title}</b>
                    <span className="text-primary-600">{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <Section tone="muted">
          <SectionHeading align="start" title="منتجات ذات صلة" className="mb-8" />
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((item) => (
              <li key={item.id}>
                <ProductCard product={item} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}

const TRUST: { icon: IconName; title: string; text: string }[] = [
  { icon: "check", title: "مراجعة فنية مجانية", text: "نفحص ملف التصميم قبل الطباعة" },
  { icon: "shield", title: "فاتورة ضريبية", text: "نظامية مع كل طلب" },
  { icon: "headset", title: "متابعة حتى التسليم", text: "تصلك التحديثات على واتساب" },
];

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse justify-center gap-1 px-3 py-4 text-center md:px-4">
      <dt className="text-primary-500 text-xs font-medium">{label}</dt>
      <dd className="text-primary-950 flex justify-center">{children}</dd>
    </div>
  );
}
