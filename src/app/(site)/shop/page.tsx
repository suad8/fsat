import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/site/PageHeader";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCategories, getProducts } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "المتجر",
  description:
    "تصفّح منتجات الطباعة والتجهيزات الدعائية: بوكسات وتغليف، أكواب ورقية وبلاستيكية، مطبوعات ورقية، استيكرات، أكريليك، لوحات إعلانية، بنرات، طباعة على الملابس، وهدايا دعائية — بأسعار واضحة وخيارات تحدّدها بنفسك.",
  alternates: { canonical: "/shop" },
};

type SearchParams = Promise<{ q?: string; sort?: string }>;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sort = normalizeSort(params.sort);
  const search = params.q?.trim() || undefined;

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ search, sort }),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ label: "المتجر", href: "/shop" }])} />

      <PageHeader
        eyebrow="المتجر"
        title="منتجات الطباعة والتجهيزات الدعائية"
        description="اختر المنتج، حدّد المقاس والخامة والكمية، وشاهد السعر يتحدّث أمامك قبل الطلب. المنتجات ذات المواصفات الخاصة تُسعَّر بعرض سعر خلال يوم عمل."
        breadcrumbs={[{ label: "المتجر", href: "/shop" }]}
        action={
          <ButtonLink href="/quote" variant="accent" size="lg">
            طلب عرض سعر
          </ButtonLink>
        }
      />

      <div className="container-page py-10 md:py-14">
        {/* Suspense مطلوب لأن ShopFilters يقرأ useSearchParams */}
        <Suspense fallback={<div className="mb-8 h-40" />}>
          <ShopFilters
            categories={categories.map((category) => ({
              slug: category.slug,
              name: category.name,
              count: category._count.products,
            }))}
            resultCount={products.length}
          />
        </Suspense>

        {products.length === 0 ? (
          <EmptyState
            icon="search"
            title={search ? "لا توجد نتائج مطابقة" : "لا توجد منتجات معروضة حاليًا"}
            description={
              search
                ? "جرّب كلمة بحث أخرى أو تصفّح الأقسام، أو أرسل لنا مواصفات ما تبحث عنه وسنوفّره لك."
                : "تُضاف المنتجات وأسعارها وخياراتها من لوحة التحكم."
            }
            action={
              <>
                <ButtonLink href="/shop" variant="outline">
                  عرض كل المنتجات
                </ButtonLink>
                <ButtonLink href="/quote" variant="accent">
                  اطلب عرض سعر
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
