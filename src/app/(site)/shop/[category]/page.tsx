import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/site/PageHeader";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCategories, getCategoryBySlug, getProducts } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { truncate } from "@/lib/utils";

type Params = Promise<{ category: string }>;
type SearchParams = Promise<{ q?: string; sort?: string }>;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) return { title: "القسم غير موجود" };

  const description =
    category.seoDescription ??
    category.description ??
    `تصفّح منتجات ${category.name} واطلب حسب المقاس والخامة والكمية.`;

  return {
    title: category.seoTitle ?? category.name,
    description: truncate(description, 160),
    alternates: { canonical: `/shop/${category.slug}` },
    openGraph: {
      title: category.name,
      description: truncate(description, 200),
      url: `/shop/${category.slug}`,
      images: category.imageUrl ? [{ url: category.imageUrl }] : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { category: slug } = await params;
  const query = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const sort = normalizeSort(query.sort);
  const search = query.q?.trim() || undefined;

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ categorySlug: slug, search, sort }),
  ]);

  const crumbs = [
    { label: "المتجر", href: "/shop" },
    { label: category.name, href: `/shop/${category.slug}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />

      <PageHeader
        eyebrow="قسم"
        title={category.name}
        description={category.description}
        breadcrumbs={crumbs}
        action={
          <ButtonLink href="/quote" variant="accent" size="lg">
            طلب عرض سعر
          </ButtonLink>
        }
      />

      <div className="container-page py-10 md:py-14">
        <Suspense fallback={<div className="mb-8 h-40" />}>
          <ShopFilters
            categories={categories.map((item) => ({
              slug: item.slug,
              name: item.name,
              count: item._count.products,
            }))}
            activeCategory={category.slug}
            resultCount={products.length}
          />
        </Suspense>

        {products.length === 0 ? (
          <EmptyState
            icon="package"
            title={
              search ? "لا توجد نتائج مطابقة في هذا القسم" : "لا توجد منتجات في هذا القسم بعد"
            }
            description={
              search
                ? "جرّب كلمة بحث أخرى، أو تصفّح بقية الأقسام."
                : `ننفّذ طلبات ${category.name} حسب المواصفات. أرسل لنا ما تحتاجه وسنرسل لك عرض سعر خلال يوم عمل.`
            }
            action={
              <>
                <ButtonLink
                  href={`/quote?product=${encodeURIComponent(category.name)}`}
                  variant="accent"
                >
                  اطلب عرض سعر
                </ButtonLink>
                <ButtonLink href="/shop" variant="outline">
                  كل المنتجات
                </ButtonLink>
              </>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function normalizeSort(
  value: string | undefined,
): "featured" | "priceAsc" | "priceDesc" | "newest" {
  if (value === "priceAsc" || value === "priceDesc" || value === "newest") return value;
  return "featured";
}
