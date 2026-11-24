import Link from "next/link";

import { ProductsTable } from "@/app/admin/(dashboard)/products/ProductsTable";
import { AdminCard, AdminEmpty, AdminHeading } from "@/components/admin/AdminUi";
import { FilterChip, FilterChips, Pagination } from "@/components/admin/ListParts";
import { ListToolbar } from "@/components/admin/ListToolbar";
import type { Prisma } from "@/generated/prisma/client";
import { firstParam, hrefWith, normalizeDigits, pageParam, type ParamBag } from "@/lib/admin/url";
import { ButtonLink } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "المنتجات" };

const PAGE_SIZE = 30;

const SORTS = {
  order: { label: "ترتيب العرض", orderBy: [{ order: "asc" }, { createdAt: "desc" }] },
  new: { label: "الأحدث", orderBy: [{ createdAt: "desc" }] },
  name: { label: "الاسم", orderBy: [{ name: "asc" }] },
  price_desc: { label: "الأعلى سعرًا", orderBy: [{ basePrice: "desc" }] },
} as const satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput[] }>;

type SortKey = keyof typeof SORTS;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const filterParam = firstParam(raw.filter);
  const filter =
    filterParam === "active" ||
    filterParam === "hidden" ||
    filterParam === "featured" ||
    filterParam === "noimage"
      ? filterParam
      : undefined;
  const q = firstParam(raw.q);
  const sortParam = firstParam(raw.sort);
  const sort: SortKey = sortParam && sortParam in SORTS ? (sortParam as SortKey) : "order";
  const page = pageParam(raw.page);
  const search = q ? normalizeDigits(q) : undefined;

  const filterWhere: Record<"active" | "hidden" | "featured" | "noimage", Prisma.ProductWhereInput> = {
    active: { isActive: true },
    hidden: { isActive: false },
    featured: { isFeatured: true },
    noimage: { images: { none: {} } },
  };

  const where: Prisma.ProductWhereInput = {
    ...(filter ? filterWhere[filter] : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { slug: { contains: search } },
            { sku: { contains: search } },
            { category: { name: { contains: search } } },
          ],
        }
      : {}),
  };

  const current: ParamBag = { filter, q, sort: sort === "order" ? undefined : sort };

  const [products, total, categoryCount, all, hidden, featured, noImage] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [...SORTS[sort].orderBy],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
    prisma.product.count({ where }),
    prisma.category.count(),
    prisma.product.count(),
    prisma.product.count({ where: filterWhere.hidden }),
    prisma.product.count({ where: filterWhere.featured }),
    prisma.product.count({ where: filterWhere.noimage }),
  ]);

  const filtered = Boolean(filter || q);

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

      {all > 0 ? (
        <div className="mb-4 space-y-3" data-adm-in>
          <FilterChips label="تصفية المنتجات">
            <FilterChip href={hrefWith("/admin/products", current, { filter: undefined })} active={!filter} count={all}>
              الكل
            </FilterChip>
            <FilterChip href={hrefWith("/admin/products", current, { filter: "active" })} active={filter === "active"} count={all - hidden}>
              منشور
            </FilterChip>
            <FilterChip href={hrefWith("/admin/products", current, { filter: "hidden" })} active={filter === "hidden"} count={hidden}>
              مخفي
            </FilterChip>
            <FilterChip href={hrefWith("/admin/products", current, { filter: "featured" })} active={filter === "featured"} count={featured}>
              مميّز
            </FilterChip>
            <FilterChip
              href={hrefWith("/admin/products", current, { filter: "noimage" })}
              active={filter === "noimage"}
              count={noImage}
              tone={noImage > 0 ? "attention" : undefined}
            >
              بلا صور
            </FilterChip>
          </FilterChips>

          <ListToolbar
            placeholder="ابحث بالاسم أو الرابط أو رمز المنتج أو القسم…"
            defaultSort="order"
            sortOptions={Object.entries(SORTS).map(([value, entry]) => ({ value, label: entry.label }))}
          />
        </div>
      ) : null}

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
            title={filtered ? "لا منتجات مطابقة" : "لا توجد منتجات بعد"}
            description={
              filtered
                ? "جرّب تعديل البحث أو اختيار فلتر آخر."
                : "ابدأ بإضافة أول منتج — يمكنك ضبط خياراته وشرائح أسعاره في نفس الشاشة."
            }
            action={
              filtered ? (
                <Link
                  href="/admin/products"
                  className="border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-10 items-center rounded-lg border px-4 text-sm font-bold"
                >
                  مسح الفلاتر
                </Link>
              ) : (
                <ButtonLink href="/admin/products/new" icon="plus">
                  إضافة منتج
                </ButtonLink>
              )
            }
          />
        ) : (
          <>
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
            <Pagination base="/admin/products" params={current} page={page} pageSize={PAGE_SIZE} total={total} />
          </>
        )}
      </AdminCard>

      <p className="text-primary-500 mt-4 text-xs">
        الأقسام تُدار من{" "}
        <Link href="/admin/categories" className="text-accent-700 font-bold hover:underline">
          صفحة الأقسام
        </Link>
        .
      </p>
    </>
  );
}
