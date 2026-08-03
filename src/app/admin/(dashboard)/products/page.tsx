import Link from "next/link";

import { ProductsTable } from "@/app/admin/(dashboard)/products/ProductsTable";
import { AdminCard, AdminEmpty, AdminHeading } from "@/components/admin/AdminUi";
import { ButtonLink } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "المنتجات" };

export default async function AdminProductsPage() {
  const [products, categoryCount] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        priceMode: true,
        basePrice: true,
        unit: true,
        isActive: true,
        isFeatured: true,
        category: { select: { name: true, slug: true } },
        images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
        _count: { select: { optionGroups: true, quantityTiers: true } },
      },
    }),
    prisma.category.count(),
  ]);

  return (
    <>
      <AdminHeading
        title="المنتجات"
        description="أضف المنتجات واضبط أسعارها وخياراتها وشرائح كمياتها."
        action={
          categoryCount > 0 ? (
            <ButtonLink href="/admin/products/new" icon="plus">
              منتج جديد
            </ButtonLink>
          ) : null
        }
      />

      <AdminCard padded={false}>
        {categoryCount === 0 ? (
          <AdminEmpty
            icon="tag"
            title="أضف قسمًا أولاً"
            description="كل منتج يجب أن ينتمي لقسم. أنشئ قسمًا واحدًا على الأقل قبل إضافة المنتجات."
            action={
              <ButtonLink href="/admin/categories/new" icon="plus">
                إضافة قسم
              </ButtonLink>
            }
          />
        ) : products.length === 0 ? (
          <AdminEmpty
            icon="package"
            title="لا توجد منتجات بعد"
            description="ابدأ بإضافة أول منتج — يمكنك ضبط خياراته وشرائح أسعاره في نفس الشاشة."
            action={
              <ButtonLink href="/admin/products/new" icon="plus">
                إضافة منتج
              </ButtonLink>
            }
          />
        ) : (
          <ProductsTable
            products={products.map((product) => ({
              id: product.id,
              name: product.name,
              slug: product.slug,
              categoryName: product.category.name,
              categorySlug: product.category.slug,
              priceMode: product.priceMode,
              basePrice: product.basePrice,
              unit: product.unit,
              isActive: product.isActive,
              isFeatured: product.isFeatured,
              imageUrl: product.images[0]?.url ?? null,
              optionCount: product._count.optionGroups,
              tierCount: product._count.quantityTiers,
            }))}
          />
        )}
      </AdminCard>

      <p className="text-primary-500 mt-4 text-xs">
        الأقسام تُدار من{" "}
        <Link href="/admin/categories" className="text-accent-700 font-bold">
          صفحة الأقسام
        </Link>
        .
      </p>
    </>
  );
}
