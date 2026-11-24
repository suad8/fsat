import { getCategories, getProducts, type ProductCard } from "@/lib/queries";
import { searchItems } from "@/lib/shop/search";

/**
 * اقتراحات البحث السريع في الترويسة.
 *
 * الفهرس صغير (اسم/قسم/سعر ابتدائي) ويُحفظ في ذاكرة العملية دقيقة واحدة،
 * فلا يضرب كل ضغطة مفتاح قاعدة البيانات. تعديلات الإدارة تظهر خلال دقيقة.
 */

export type SuggestProduct = {
  name: string;
  href: string;
  category: string;
  startingPrice: number | null;
  startsFrom: boolean;
  imageUrl: string | null;
};

export type SuggestCategory = { name: string; href: string; count: number };

export type Suggestions = {
  products: SuggestProduct[];
  categories: SuggestCategory[];
};

const TTL_MS = 60_000;

let cache: { at: number; products: ProductCard[]; categories: SuggestCategory[] } | null = null;

async function getIndex() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;

  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  cache = {
    at: Date.now(),
    products,
    categories: categories
      .filter((category) => category._count.products > 0)
      .map((category) => ({
        name: category.name,
        href: `/shop/${category.slug}`,
        count: category._count.products,
      })),
  };
  return cache;
}

export async function getSuggestions(query: string): Promise<Suggestions> {
  const index = await getIndex();

  const products = searchItems(index.products, query, (product) => ({
    title: product.name,
    extra: [product.categoryName, product.shortDescription ?? ""],
  }))
    .slice(0, 6)
    .map<SuggestProduct>((product) => ({
      name: product.name,
      href: product.href,
      category: product.categoryName,
      startingPrice: product.startingPrice,
      startsFrom: product.priceMode === "STARTS_FROM",
      imageUrl: product.imageUrl,
    }));

  const categories = searchItems(index.categories, query, (category) => ({
    title: category.name,
  })).slice(0, 3);

  return { products, categories };
}

/** أقسام مقترحة عند فتح البحث قبل الكتابة. */
export async function getPopularCategories(): Promise<SuggestCategory[]> {
  const index = await getIndex();
  return index.categories.slice(0, 6);
}
