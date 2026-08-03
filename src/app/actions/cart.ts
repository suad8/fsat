"use server";

import type { CartItem } from "@/components/cart/CartProvider";
import type { PriceMode } from "@/lib/constants";
import {
  calculatePrice,
  defaultSelection,
  describeSelection,
  type PricingOptionGroup,
} from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

/**
 * يبني بند سلة بالمواصفات الافتراضية للمنتج.
 *
 * تُستخدم في زر "أضف للسلة" داخل بطاقات المنتجات، حيث لا يكون العميل قد
 * فتح صفحة المنتج ليختار المواصفات. الحساب يتم على الخادم فلا تُرسَل بيانات
 * التسعير كاملة إلى المتصفّح مع كل بطاقة.
 */
export async function buildDefaultCartItem(
  productId: string,
): Promise<{ ok: true; item: Omit<CartItem, "lineId"> } | { ok: false; error: string }> {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    include: {
      category: { select: { slug: true } },
      images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
      quantityTiers: { orderBy: { minQty: "asc" } },
      optionGroups: {
        orderBy: { order: "asc" },
        include: { values: { where: { isActive: true }, orderBy: { order: "asc" } } },
      },
    },
  });

  if (!product) {
    return { ok: false, error: "المنتج غير متوفر حاليًا." };
  }

  if (product.priceMode === "QUOTE_ONLY") {
    return {
      ok: false,
      error: "هذا المنتج يحتاج عرض سعر بعد مراجعة المواصفات.",
    };
  }

  const groups = product.optionGroups as unknown as PricingOptionGroup[];
  const selection = defaultSelection(groups);

  const breakdown = calculatePrice(
    {
      priceMode: product.priceMode as PriceMode,
      basePrice: product.basePrice,
      minQuantity: product.minQuantity,
      quantityStep: product.quantityStep,
      quantityTiers: product.quantityTiers,
      optionGroups: groups,
    },
    selection,
    product.minQuantity,
  );

  if (!breakdown.priceable) {
    return { ok: false, error: "تعذّر حساب سعر هذا المنتج." };
  }

  return {
    ok: true,
    item: {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.images[0]?.url ?? null,
      unit: product.unit,
      quantity: breakdown.quantity,
      unitPrice: breakdown.unitPrice,
      flatFees: breakdown.flatFees,
      total: breakdown.total,
      options: describeSelection(groups, selection),
    },
  };
}
