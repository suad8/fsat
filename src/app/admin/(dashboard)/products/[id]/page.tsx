import { notFound } from "next/navigation";

import { AdminHeading } from "@/components/admin/AdminUi";
import { ProductEditor, type ProductDraft } from "@/components/admin/ProductEditor";
import { ButtonLink } from "@/components/ui/Button";
import type { OptionPriceMode, OptionType, PriceMode } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export const metadata = { title: "تعديل منتج" };

export default async function EditProductPage({ params }: { params: Params }) {
  const { id } = await params;

  const [product, categories, services] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { slug: true } },
        images: { orderBy: { order: "asc" } },
        quantityTiers: { orderBy: { minQty: "asc" } },
        optionGroups: {
          orderBy: { order: "asc" },
          include: { values: { orderBy: { order: "asc" } } },
        },
        services: { select: { id: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.service.findMany({ orderBy: { order: "asc" }, select: { id: true, title: true } }),
  ]);

  if (!product) notFound();

  const draft: ProductDraft = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    categoryId: product.categoryId,
    priceMode: product.priceMode as PriceMode,
    basePrice: product.basePrice,
    compareAtPrice: product.compareAtPrice,
    unit: product.unit,
    minQuantity: product.minQuantity,
    quantityStep: product.quantityStep,
    sku: product.sku ?? "",
    leadTime: product.leadTime ?? "",
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    order: product.order,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    images: product.images.map((image) => ({ url: image.url, alt: image.alt })),
    quantityTiers: product.quantityTiers.map((tier) => ({
      minQty: tier.minQty,
      maxQty: tier.maxQty,
      unitPrice: tier.unitPrice,
      label: tier.label ?? "",
    })),
    optionGroups: product.optionGroups.map((group) => ({
      name: group.name,
      key: group.key,
      type: group.type as OptionType,
      helpText: group.helpText ?? "",
      isRequired: group.isRequired,
      values: group.values.map((value) => ({
        label: value.label,
        value: value.value,
        priceModifier: value.priceModifier,
        priceMode: value.priceMode as OptionPriceMode,
        swatchHex: value.swatchHex ?? "",
        isDefault: value.isDefault,
        isActive: value.isActive,
      })),
    })),
    serviceIds: product.services.map((service) => service.id),
  };

  return (
    <>
      <AdminHeading
        title="تعديل المنتج"
        description={product.name}
        backHref="/admin/products"
        backLabel="رجوع إلى المنتجات"
        action={
          <ButtonLink
            href={`/shop/${product.category.slug}/${product.slug}`}
            external
            variant="outline"
            size="sm"
            iconAfter="externalLink"
          >
            معاينة في الموقع
          </ButtonLink>
        }
      />

      <ProductEditor initial={draft} categories={categories} services={services} />
    </>
  );
}
