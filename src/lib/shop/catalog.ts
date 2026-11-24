import type { ProductCard } from "@/lib/queries";
import { filterItems, searchItems } from "@/lib/shop/search";

export type ShopSort = "featured" | "priceAsc" | "priceDesc" | "newest";
export type ShopMode = "" | "direct" | "quote";

export function normalizeSort(value: string | undefined): ShopSort {
  if (value === "priceAsc" || value === "priceDesc" || value === "newest") return value;
  return "featured";
}

export function normalizeMode(value: string | undefined): ShopMode {
  return value === "direct" || value === "quote" ? value : "";
}

/**
 * فلترة المنتجات في الذاكرة: بحث عربي متسامح + نوع التسعير.
 * الفرز الافتراضي مع بحث يرتّب بالصلة؛ ترتيب السعر/الأحدث يُحترم كما هو.
 */
export function applyShopFilters(
  products: ProductCard[],
  options: { search?: string; mode?: ShopMode; sort?: ShopSort },
): ProductCard[] {
  const { search, mode, sort = "featured" } = options;

  let result = products;

  if (mode === "direct") result = result.filter((product) => product.priceMode !== "QUOTE_ONLY");
  if (mode === "quote") result = result.filter((product) => product.priceMode === "QUOTE_ONLY");

  if (search) {
    const pick = (product: ProductCard) => ({
      title: product.name,
      extra: [product.categoryName, product.shortDescription ?? ""],
    });
    result =
      sort === "featured" ? searchItems(result, search, pick) : filterItems(result, search, pick);
  }

  return result;
}
