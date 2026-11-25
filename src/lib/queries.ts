import { decodeSlug } from "@/lib/utils";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { stripPlaceholders } from "@/lib/data/placeholders";
import { calculateStartingPrice, toPricingProduct } from "@/lib/pricing";
import type { OptionType, PriceMode } from "@/lib/constants";

/**
 * استعلامات القراءة المشتركة بين الصفحات.
 *
 * كلها ملفوفة بـ cache() فيُنفَّذ الاستعلام مرة واحدة لكل طلب مهما تكرر
 * استدعاؤه في الصفحة وفي generateMetadata معًا.
 */

// ---------------------------------------------------------------------------
// التصنيفات
// ---------------------------------------------------------------------------

export const getCategories = cache(async () => {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      imageUrl: true,
      imageAlt: true,
      iconKey: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
});

export const getCategoryBySlug = cache(async (slug: string) => {
  slug = decodeSlug(slug);
  return prisma.category.findFirst({
    where: { slug, isActive: true },
  });
});

// ---------------------------------------------------------------------------
// المنتجات
// ---------------------------------------------------------------------------

const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  priceMode: true,
  basePrice: true,
  compareAtPrice: true,
  unit: true,
  minQuantity: true,
  quantityStep: true,
  leadTime: true,
  isFeatured: true,
  category: { select: { slug: true, name: true, iconKey: true } },
  images: { orderBy: { order: "asc" }, take: 1, select: { url: true, alt: true } },
  quantityTiers: {
    orderBy: { minQty: "asc" },
    select: { minQty: true, maxQty: true, unitPrice: true, label: true },
  },
  optionGroups: {
    orderBy: { order: "asc" },
    select: {
      id: true,
      key: true,
      name: true,
      type: true,
      isRequired: true,
      values: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          value: true,
          priceModifier: true,
          priceMode: true,
          isDefault: true,
          isActive: true,
        },
      },
    },
  },
} as const;

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  priceMode: PriceMode;
  compareAtPrice: number | null;
  unit: string;
  minQuantity: number;
  leadTime: string | null;
  isFeatured: boolean;
  categorySlug: string;
  categoryName: string;
  categoryIcon: string | null;
  imageUrl: string | null;
  imageAlt: string;
  /** أقل سعر ممكن — null للمنتجات التي تحتاج عرض سعر. */
  startingPrice: number | null;
  href: string;
};

type RawProduct = Awaited<ReturnType<typeof prisma.product.findMany>> extends (infer T)[]
  ? T
  : never;

/** يحوّل سجل المنتج إلى الشكل الذي تستهلكه البطاقات، مع حساب "يبدأ من". */
function toProductCard(product: {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  priceMode: string;
  basePrice: number;
  compareAtPrice: number | null;
  unit: string;
  minQuantity: number;
  quantityStep: number;
  leadTime: string | null;
  isFeatured: boolean;
  category: { slug: string; name: string; iconKey: string | null };
  images: { url: string; alt: string }[];
  quantityTiers: { minQty: number; maxQty: number | null; unitPrice: number; label: string | null }[];
  optionGroups: {
    id: string;
    key: string;
    name: string;
    type: string;
    isRequired: boolean;
    values: {
      id: string;
      label: string;
      value: string;
      priceModifier: number;
      priceMode: string;
      isDefault: boolean;
      isActive: boolean;
    }[];
  }[];
}): ProductCard {
  const pricing = toPricingProduct(product);

  return {
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
    startingPrice: calculateStartingPrice(pricing),
    href: `/shop/${product.category.slug}/${product.slug}`,
  };
}

export const getFeaturedProducts = cache(async (limit = 8): Promise<ProductCard[]> => {
  const products = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: productCardSelect,
  });

  return products.map(toProductCard);
});

export const getProducts = cache(
  async (options?: {
    categorySlug?: string;
    search?: string;
    sort?: "featured" | "priceAsc" | "priceDesc" | "newest";
  }): Promise<ProductCard[]> => {
    const { categorySlug, sort = "featured" } = options ?? {};
    // مدخل بحث مفرط الطول لا فائدة منه ويُبطئ LIKE — نقصّه
    const search = options?.search?.trim().slice(0, 100) || undefined;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { shortDescription: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy:
        sort === "newest"
          ? [{ createdAt: "desc" }]
          : [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
      select: productCardSelect,
    });

    const cards = products.map(toProductCard);

    // الترتيب بالسعر يتم بعد الحساب، لأن "يبدأ من" ليس عمودًا في القاعدة
    if (sort === "priceAsc" || sort === "priceDesc") {
      cards.sort((a, b) => {
        // منتجات عرض السعر تُدفع لآخر القائمة في الحالتين
        if (a.startingPrice === null && b.startingPrice === null) return 0;
        if (a.startingPrice === null) return 1;
        if (b.startingPrice === null) return -1;
        return sort === "priceAsc"
          ? a.startingPrice - b.startingPrice
          : b.startingPrice - a.startingPrice;
      });
    }

    return cards;
  },
);

export const getProductBySlug = cache(async (slug: string) => {
  slug = decodeSlug(slug);
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: { select: { slug: true, name: true, iconKey: true } },
      images: { orderBy: { order: "asc" } },
      quantityTiers: { orderBy: { minQty: "asc" } },
      optionGroups: {
        orderBy: { order: "asc" },
        include: {
          values: { where: { isActive: true }, orderBy: { order: "asc" } },
        },
      },
      services: { select: { slug: true, title: true } },
    },
  });
});

export const getRelatedProducts = cache(
  async (categorySlug: string, excludeSlug: string, limit = 4): Promise<ProductCard[]> => {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        category: { slug: categorySlug },
        slug: { not: excludeSlug },
      },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
      take: limit,
      select: productCardSelect,
    });

    return products.map(toProductCard);
  },
);

// ---------------------------------------------------------------------------
// الخدمات
// ---------------------------------------------------------------------------

export const getServices = cache(async (onlyFeatured = false) => {
  return prisma.service.findMany({
    where: { isActive: true, ...(onlyFeatured ? { isFeatured: true } : {}) },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      iconKey: true,
      imageUrl: true,
      imageAlt: true,
    },
  });
});

export const getServiceBySlug = cache(async (slug: string) => {
  slug = decodeSlug(slug);
  return prisma.service.findFirst({
    where: { slug, isActive: true },
    include: {
      images: { orderBy: { order: "asc" } },
      products: {
        where: { isActive: true },
        orderBy: [{ order: "asc" }],
        select: productCardSelect,
      },
    },
  });
});

// ---------------------------------------------------------------------------
// معرض الأعمال
// ---------------------------------------------------------------------------

export const getProjectCategories = cache(async () => {
  return prisma.projectCategory.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { projects: { where: { isActive: true } } } },
    },
  });
});

export const getProjects = cache(
  async (options?: { categorySlug?: string; limit?: number; featuredOnly?: boolean }) => {
    const { categorySlug, limit, featuredOnly } = options ?? {};

    return prisma.project.findMany({
      where: {
        isActive: true,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
        ...(featuredOnly ? { isFeatured: true } : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { completedAt: "desc" }],
      ...(limit ? { take: limit } : {}),
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        materials: true,
        dimensions: true,
        completedAt: true,
        category: { select: { slug: true, name: true } },
        images: {
          orderBy: { order: "asc" },
          take: 1,
          select: { url: true, alt: true },
        },
      },
    });
  },
);

export const getProjectBySlug = cache(async (slug: string) => {
  slug = decodeSlug(slug);
  return prisma.project.findFirst({
    where: { slug, isActive: true },
    include: {
      category: { select: { slug: true, name: true } },
      images: { orderBy: { order: "asc" } },
      relatedProduct: {
        select: { slug: true, name: true, category: { select: { slug: true } } },
      },
    },
  });
});

// ---------------------------------------------------------------------------
// محتوى عام
// ---------------------------------------------------------------------------

export const getApprovedTestimonials = cache(async (limit?: number) => {
  return prisma.testimonial.findMany({
    where: { isApproved: true },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    ...(limit ? { take: limit } : {}),
  });
});

export const getFaqs = cache(async () => {
  return prisma.faq.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
});

export const getEquipment = cache(async () => {
  return prisma.equipment.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
});

/**
 * الصفحة الثابتة للزائر. أي علامة «يحتاج استبدال» أو سطر تحذير مسوّدة قديم
 * يُزال هنا فلا يراه العميل؛ الإدارة ترى النص الخام وعلامة needsReview.
 */
export const getPageBySlug = cache(async (slug: string) => {
  slug = decodeSlug(slug);
  const page = await prisma.page.findFirst({ where: { slug, isActive: true } });
  if (!page) return null;

  return {
    ...page,
    title: stripPlaceholders(page.title),
    content: stripPlaceholders(page.content),
    seoTitle: page.seoTitle ? stripPlaceholders(page.seoTitle) : null,
    seoDescription: page.seoDescription ? stripPlaceholders(page.seoDescription) : null,
  };
});

export const getShippingZones = cache(async () => {
  return prisma.shippingZone.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }],
  });
});

/** يُستخدم في نموذج عرض السعر لملء قائمة "نوع المنتج أو الخدمة". */
export const getQuoteSubjects = cache(async () => {
  const [services, categories] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { title: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { name: true },
    }),
  ]);

  const unique = new Set<string>();
  for (const service of services) unique.add(service.title);
  for (const category of categories) unique.add(category.name);

  return [...unique];
});

export type { OptionType };
export type { RawProduct };
