import { getProducts, type ProductCard } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

/**
 * «الأكثر طلبًا» من بيانات حقيقية: عدد الطلبات غير الملغاة التي تضمّنت المنتج
 * خلال آخر ٦ أشهر. لا نعرض هذا الوصف إلا إذا وُجدت طلبات فعلية تدعمه، وإلا
 * تعرض الصفحة «مختارات المتجر» بعنوان صادق.
 */

export type PopularProducts = {
  products: ProductCard[];
  /** true = ترتيب من طلبات فعلية. false = مختارات الإدارة. */
  fromOrders: boolean;
};

const WINDOW_DAYS = 180;
/** أقل عدد منتجات مطلوبة فعلًا لنصف القسم بـ «الأكثر طلبًا». */
const MIN_PRODUCTS = 3;

export async function getPopularProducts(limit = 8): Promise<PopularProducts> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  let ranked: { productId: string; orders: number }[] = [];

  try {
    const rows = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        order: { status: { not: "CANCELLED" }, createdAt: { gte: since } },
      },
      _count: { orderId: true },
      orderBy: { _count: { orderId: "desc" } },
      take: limit * 2,
    });

    ranked = rows
      .filter((row): row is typeof row & { productId: string } => row.productId !== null)
      .map((row) => ({ productId: row.productId, orders: row._count.orderId }));
  } catch {
    ranked = [];
  }

  const all = await getProducts();
  const byId = new Map(all.map((product) => [product.id, product]));

  const fromOrders = ranked
    .map((row) => byId.get(row.productId))
    .filter((product): product is ProductCard => Boolean(product))
    .slice(0, limit);

  if (fromOrders.length >= MIN_PRODUCTS) {
    return { products: fromOrders, fromOrders: true };
  }

  const featured = all.filter((product) => product.isFeatured).slice(0, limit);
  return { products: featured.length > 0 ? featured : all.slice(0, limit), fromOrders: false };
}
