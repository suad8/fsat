import { z } from "zod";

import { FULFILLMENT_METHODS, type PriceMode } from "@/lib/constants";
import { calculateShipping } from "@/lib/orders";
import {
  calculatePrice,
  type OptionSelection,
  type PricingOptionGroup,
} from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { round2 } from "@/lib/utils";
import { checkoutItemSchema } from "@/lib/validation";

/**
 * معاينة الطلب على الخادم — نفس حسابات إنشاء الطلب بلا حفظ.
 *
 * يخدم السلة والدفع: يتحقق من الأسعار الحالية، ويحسب الشحن والضريبة
 * والكوبون قبل أن يضغط العميل «تأكيد»، فلا مفاجأة في الخطوة الأخيرة.
 * الصيغ هنا تطابق src/lib/orders.ts (createOrder) سطرًا بسطر؛ إن تغيّرت
 * هناك فيجب تغييرها هنا (يُفضَّل أن يصدّر محور البيانات دالة معاينة مشتركة).
 */

export const cartQuoteSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(50),
  fulfillment: z.enum(FULFILLMENT_METHODS).default("DELIVERY"),
  city: z.string().trim().max(60).optional(),
  couponCode: z.string().trim().max(40).optional(),
});

export type CartQuoteInput = z.output<typeof cartQuoteSchema>;

export type QuoteLine = {
  index: number;
  status: "ok" | "unavailable" | "quote-only" | "incomplete";
  message?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type QuoteShipping = {
  /** pickup | pending (لم تُختر المدينة) | free | paid */
  mode: "pickup" | "pending" | "free" | "paid";
  cost: number;
  zoneName: string | null;
  estimatedDays: string | null;
  /** حد الشحن المجاني للمنطقة، إن وُجد. */
  freeOverAmount: number | null;
  /** المتبقي ليصير الشحن مجانيًا. */
  remainingForFree: number | null;
  /** أقل/أعلى تكلفة عبر المناطق — للشفافية قبل اختيار المدينة. */
  range: { min: number; max: number } | null;
};

export type CartQuote = {
  ok: boolean;
  lines: QuoteLine[];
  subtotal: number;
  discountAmount: number;
  coupon: { code: string; label: string } | null;
  couponError: string | null;
  shipping: QuoteShipping;
  vatRate: number;
  pricesIncludeVat: boolean;
  vatAmount: number;
  total: number;
  /** جاهز للإرسال: كل البنود صالحة. */
  payable: boolean;
};

export async function quoteCart(input: CartQuoteInput): Promise<CartQuote> {
  const settings = await getSettings();

  const lines: QuoteLine[] = await Promise.all(
    input.items.map(async (item, index): Promise<QuoteLine> => {
      const fail = (status: QuoteLine["status"], message: string): QuoteLine => ({
        index,
        status,
        message,
        quantity: item.quantity,
        unitPrice: 0,
        lineTotal: 0,
      });

      const product = await prisma.product.findFirst({
        where: { id: item.productId, isActive: true },
        include: {
          quantityTiers: { orderBy: { minQty: "asc" } },
          optionGroups: {
            orderBy: { order: "asc" },
            include: { values: { where: { isActive: true }, orderBy: { order: "asc" } } },
          },
        },
      });

      if (!product) return fail("unavailable", "لم يعد هذا المنتج متوفرًا.");
      if (product.priceMode === "QUOTE_ONLY") {
        return fail("quote-only", "يُسعَّر هذا المنتج بعرض سعر — احذفه واطلب عرض سعر.");
      }

      const groups = product.optionGroups as unknown as PricingOptionGroup[];
      const selection = sanitizeSelection(groups, item.selection);

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
        item.quantity,
      );

      if (!breakdown.priceable) return fail("unavailable", "تعذّر حساب سعر هذا البند.");
      if (breakdown.missingRequired.length > 0) {
        return fail("incomplete", "ينقص هذا البند اختيار مواصفات — افتح المنتج وأكملها.");
      }

      return {
        index,
        status: "ok",
        quantity: breakdown.quantity,
        unitPrice: breakdown.unitPrice,
        lineTotal: breakdown.total,
      };
    }),
  );

  const subtotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));

  // --- الكوبون ---
  let discountAmount = 0;
  let coupon: CartQuote["coupon"] = null;
  let couponError: string | null = null;

  if (input.couponCode) {
    const result = await evaluateCoupon(input.couponCode, subtotal);
    if (result.ok) {
      discountAmount = result.discount;
      coupon = { code: result.code, label: result.label };
    } else {
      couponError = result.error;
    }
  }

  // --- الشحن ---
  const shipping = await resolveShipping(
    input.fulfillment,
    input.city,
    round2(subtotal - discountAmount),
  );

  // --- الضريبة والإجمالي ---
  const taxableBase = round2(subtotal - discountAmount + shipping.cost);
  const vatAmount = settings.pricesIncludeVat
    ? round2(taxableBase - taxableBase / (1 + settings.vatRate))
    : round2(taxableBase * settings.vatRate);
  const total = settings.pricesIncludeVat ? taxableBase : round2(taxableBase + vatAmount);

  const payable = lines.every((line) => line.status === "ok");

  return {
    ok: true,
    lines,
    subtotal,
    discountAmount,
    coupon,
    couponError,
    shipping,
    vatRate: settings.vatRate,
    pricesIncludeVat: settings.pricesIncludeVat,
    vatAmount,
    total,
    payable,
  };
}

// ---------------------------------------------------------------------------

async function resolveShipping(
  fulfillment: "PICKUP" | "DELIVERY",
  city: string | undefined,
  orderValue: number,
): Promise<QuoteShipping> {
  const zones = await prisma.shippingZone.findMany({ where: { isActive: true } });
  const costs = zones.map((zone) => zone.cost);
  const range = costs.length > 0 ? { min: Math.min(...costs), max: Math.max(...costs) } : null;

  const base = {
    zoneName: null,
    estimatedDays: null,
    freeOverAmount: null,
    remainingForFree: null,
    range,
  } satisfies Partial<QuoteShipping>;

  if (fulfillment === "PICKUP") return { ...base, mode: "pickup", cost: 0, range: null };
  if (!city) return { ...base, mode: "pending", cost: 0 };

  const zone = zones.find((candidate) => {
    const cities = Array.isArray(candidate.cities) ? (candidate.cities as string[]) : [];
    return cities.includes(city);
  });

  // التكلفة تأتي من نفس دالة إنشاء الطلب فلا يختلف الرقم المعروض عن المحصَّل
  const cost = await calculateShipping(city, orderValue);

  const freeOver = zone?.freeOverAmount ?? null;

  return {
    mode: cost === 0 ? "free" : "paid",
    cost,
    zoneName: zone?.name ?? null,
    estimatedDays: zone?.estimatedDays ?? null,
    freeOverAmount: freeOver,
    remainingForFree:
      freeOver !== null && orderValue < freeOver ? round2(freeOver - orderValue) : null,
    range,
  };
}

type CouponEvaluation =
  | { ok: true; discount: number; code: string; label: string }
  | { ok: false; error: string };

async function evaluateCoupon(code: string, subtotal: number): Promise<CouponEvaluation> {
  const normalized = code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });

  if (!coupon || !coupon.isActive) {
    return { ok: false, error: "رمز الخصم غير صحيح — تأكد من كتابته كما وصلك." };
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, error: "هذا الرمز لم يبدأ سريانه بعد." };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { ok: false, error: "انتهت صلاحية هذا الرمز." };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "استُنفد عدد مرات استخدام هذا الرمز." };
  }
  if (coupon.minOrderAmount !== null && subtotal < coupon.minOrderAmount) {
    return {
      ok: false,
      error: `يُطبَّق هذا الرمز على الطلبات من ${coupon.minOrderAmount} ر.س فأكثر.`,
    };
  }

  const discount =
    coupon.type === "PERCENT" ? round2(subtotal * (coupon.value / 100)) : round2(coupon.value);

  return {
    ok: true,
    discount: Math.min(discount, subtotal),
    code: normalized,
    label: coupon.type === "PERCENT" ? `خصم ${coupon.value}٪` : `خصم ${coupon.value} ر.س`,
  };
}

/** يستبعد أي معرّف خيار لا ينتمي لهذا المنتج (نفس منطق createOrder). */
function sanitizeSelection(
  groups: PricingOptionGroup[],
  incoming: Record<string, string | string[]>,
): OptionSelection {
  const clean: OptionSelection = {};

  for (const group of groups) {
    const raw = incoming[group.key];
    if (raw === undefined) continue;

    const validIds = new Set(group.values.map((value) => value.id));

    if (Array.isArray(raw)) {
      const filtered = raw.filter((id) => validIds.has(id));
      if (filtered.length > 0) clean[group.key] = filtered;
      continue;
    }

    if (validIds.has(raw)) {
      clean[group.key] = raw;
      continue;
    }

    if (group.values.length === 0 && typeof raw === "string") {
      clean[group.key] = raw.slice(0, 500);
    }
  }

  return clean;
}
