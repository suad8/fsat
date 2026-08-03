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
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeading } from "@/components/ui/Section";
import { brand, commerce } from "@/config/brand";
import type { PriceMode } from "@/lib/constants";
import { calculateStartingPrice } from "@/lib/pricing";
import { getProductBySlug, getProducts, getRelatedProducts } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd, productJsonLd } from "@/lib/seo";
import { truncate } from "@/lib/utils";

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
        <div className="container-page py-4">
          <Breadcrumbs items={crumbs} />
        </div>
      </div>

      {/* pb كبير على الجوال ليفسح مكانًا للشريط السفلي الثابت */}
      <div className="container-page py-8 pb-28 md:py-12 md:pb-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* --- الصور والوصف --- */}
          <div>
            <ProductGallery
              images={product.images.map((image) => ({
                id: image.id,
                url: image.url,
                alt: image.alt,
              }))}
              productName={product.name}
              categoryIcon={product.category.iconKey}
            />

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

              <h1 className="text-2xl md:text-3xl">{product.name}</h1>

              {product.shortDescription ? (
                <p className="text-primary-600 mt-3 leading-relaxed">
                  {product.shortDescription}
                </p>
              ) : null}

              <ul className="mt-5 flex flex-wrap gap-2">
                {product.leadTime ? (
                  <li>
                    <Badge icon="clock">مدة التنفيذ: {product.leadTime}</Badge>
                  </li>
                ) : null}
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
