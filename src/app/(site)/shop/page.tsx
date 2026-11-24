import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/site/PageHeader";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCategories, getProducts } from "@/lib/queries";
import { applyShopFilters, normalizeMode, normalizeSort } from "@/lib/shop/catalog";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "المتجر",
  description:
    "تصفّح منتجات الطباعة والتجهيزات الدعائية: بوكسات وتغليف، أكواب ورقية وبلاستيكية، مطبوعات ورقية، استيكرات، أكريليك، لوحات إعلانية، بنرات، طباعة على الملابس، وهدايا دعائية — بأسعار واضحة وخيارات تحدّدها بنفسك.",
  alternates: { canonical: "/shop" },
};

type SearchParams = Promise<{ q?: string; sort?: string; mode?: string }>;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sort = normalizeSort(params.sort);
  const mode = normalizeMode(params.mode);
  const search = params.q?.trim().slice(0, 80) || undefined;

  const [categories, all] = await Promise.all([getCategories(), getProducts({ sort })]);
  const products = applyShopFilters(all, { search, mode, sort });

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ label: "المتجر", href: "/shop" }])} />

      <PageHeader
        compact
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

      <div className="container-page py-6 md:py-8">
        {/* Suspense مطلوب لأن ShopFilters يقرأ useSearchParams */}
        <Suspense fallback={<div className="mb-8 h-40" />}>
          <ShopFilters
            categories={categories.map((category) => ({
              slug: category.slug,
              name: category.name,
              count: category._count.products,
              iconKey: category.iconKey,
            }))}
            resultCount={products.length}
          />
        </Suspense>

        {products.length === 0 ? (
          <EmptyState
            icon="search"
            title={
              search || mode ? "لا توجد نتائج مطابقة" : "لا توجد منتجات معروضة حاليًا"
            }
            description={
              search || mode
                ? "جرّب كلمة بحث أخرى أو أزل الفلاتر، أو أرسل لنا مواصفات ما تبحث عنه وسنوفّره لك."
                : "نجهّز منتجات المتجر حاليًا. تواصل معنا وسنرسل لك عرض سعر بما تحتاجه."
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
            {products.map((product, index) => (
              <Reveal as="li" key={product.id} delay={(index % 4) * 70}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
