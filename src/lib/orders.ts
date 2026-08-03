import type { PriceMode } from "@/lib/constants";
import {
  calculatePrice,
  describeSelection,
  type OptionSelection,
  type PricingOptionGroup,
} from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/reference";
import { getSettings } from "@/lib/settings";
import { round2 } from "@/lib/utils";
import type { CheckoutData } from "@/lib/validation";

/**
 * إنشاء الطلبات.
 *
 * القاعدة الحاكمة هنا: **لا يُقبل أي سعر يصل من المتصفّح**. كل بند يُعاد
 * حسابه من بيانات المنتج في قاعدة البيانات، وكذلك الخصم والشحن والضريبة.
 * ما ترسله السلة هو المنتج والخيارات والكمية فقط.
 */

export type OrderCreationResult =
  | { ok: true; orderNumber: string; total: number }
  | { ok: false; error: string; field?: string };

type PricedItem = {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  selectedOptions: { key: string; label: string; value: string; valueLabel: string }[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
};

export async function createOrder(data: CheckoutData): Promise<OrderCreationResult> {
  const settings = await getSettings();

  // --- ١. إعادة تسعير كل بند من القاعدة ---
  const priced: PricedItem[] = [];

  for (const item of data.items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, isActive: true },
      include: {
        images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
        quantityTiers: { orderBy: { minQty: "asc" } },
        optionGroups: {
          orderBy: { order: "asc" },
          include: { values: { where: { isActive: true }, orderBy: { order: "asc" } } },
        },
      },
    });

    if (!product) {
      return { ok: false, error: "أحد المنتجات في سلتك لم يعد متوفرًا. حدّث السلة ثم أعد المحاولة." };
    }

    if (product.priceMode === "QUOTE_ONLY") {
      return {
        ok: false,
        error: `المنتج "${product.name}" يحتاج عرض سعر ولا يمكن شراؤه مباشرة. احذفه من السلة وأرسل طلب عرض سعر.`,
      };
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

    if (!breakdown.priceable) {
      return { ok: false, error: `تعذّر حساب سعر المنتج "${product.name}".` };
    }

    if (breakdown.missingRequired.length > 0) {
      return {
        ok: false,
        error: `المنتج "${product.name}" ينقصه اختيار المواصفات. افتح صفحة المنتج وأكمل الخيارات.`,
      };
    }

    priced.push({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: product.images[0]?.url ?? null,
      selectedOptions: describeSelection(groups, selection),
      quantity: breakdown.quantity,
      unitPrice: breakdown.unitPrice,
      lineTotal: breakdown.total,
      notes: item.notes,
    });
  }

  const subtotal = round2(priced.reduce((sum, item) => sum + item.lineTotal, 0));

  // --- ٢. الكوبون ---
  let discountAmount = 0;
  let appliedCoupon: string | null = null;

  if (data.couponCode) {
    const coupon = await validateCoupon(data.couponCode, subtotal);
    if (!coupon.ok) {
      return { ok: false, error: coupon.error, field: "couponCode" };
    }
    discountAmount = coupon.discount;
    appliedCoupon = coupon.code;
  }

  // --- ٣. الشحن ---
  let shippingCost = 0;

  if (data.fulfillment === "DELIVERY" && data.city) {
    shippingCost = await calculateShipping(data.city, subtotal - discountAmount);
  }

  // --- ٤. الضريبة ---
  const taxableBase = round2(subtotal - discountAmount + shippingCost);
  const vatAmount = settings.pricesIncludeVat
    ? round2(taxableBase - taxableBase / (1 + settings.vatRate))
    : round2(taxableBase * settings.vatRate);

  const total = settings.pricesIncludeVat ? taxableBase : round2(taxableBase + vatAmount);

  // --- ٥. الحفظ ---
  try {
    const orderNumber = await generateOrderNumber();

    // ربط الطلب بسجل عميل واحد لكل رقم جوال — يبني سجل العملاء تلقائيًا
    const customer = await prisma.customer.upsert({
      where: { phone: data.customerPhone },
      update: {
        name: data.customerName,
        ...(data.customerEmail ? { email: data.customerEmail } : {}),
        ...(data.companyName ? { companyName: data.companyName } : {}),
        ...(data.city ? { city: data.city } : {}),
      },
      create: {
        phone: data.customerPhone,
        name: data.customerName,
        email: data.customerEmail,
        companyName: data.companyName,
        city: data.city,
      },
    });

    await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        companyName: data.companyName,
        fulfillment: data.fulfillment,
        city: data.city,
        district: data.district,
        addressLine: data.addressLine,
        postalCode: data.postalCode,
        paymentMethod: data.paymentMethod,
        subtotal,
        discountAmount,
        couponCode: appliedCoupon,
        shippingCost,
        vatAmount,
        total,
        notes: data.notes,
        items: {
          create: priced.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productSlug: item.productSlug,
            imageUrl: item.imageUrl,
            selectedOptions: item.selectedOptions,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            notes: item.notes,
          })),
        },
      },
    });

    if (appliedCoupon) {
      await prisma.coupon.update({
        where: { code: appliedCoupon },
        data: { usedCount: { increment: 1 } },
      });
    }

    return { ok: true, orderNumber, total };
  } catch (error) {
    console.error("[orders] فشل إنشاء الطلب:", error);
    return { ok: false, error: "تعذّر حفظ الطلب. حاول مرة أخرى أو تواصل معنا عبر واتساب." };
  }
}

/**
 * يستبعد أي معرّف خيار لا ينتمي فعلاً لهذا المنتج.
 * بدون هذا، يمكن إرسال معرّف قيمة من منتج آخر أرخص للتأثير على السعر.
 */
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

    // الحقول الحرّة (نص، تاريخ) ليس لها قيم معرّفة — تُقبل كنص محدود الطول
    if (group.values.length === 0 && typeof raw === "string") {
      clean[group.key] = raw.slice(0, 500);
    }
  }

  return clean;
}

type CouponResult = { ok: true; discount: number; code: string } | { ok: false; error: string };

async function validateCoupon(code: string, subtotal: number): Promise<CouponResult> {
  const normalized = code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });

  if (!coupon || !coupon.isActive) {
    return { ok: false, error: "رمز الخصم غير صحيح." };
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, error: "رمز الخصم لم يبدأ سريانه بعد." };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { ok: false, error: "انتهت صلاحية رمز الخصم." };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "تم استنفاد عدد مرات استخدام هذا الرمز." };
  }
  if (coupon.minOrderAmount !== null && subtotal < coupon.minOrderAmount) {
    return {
      ok: false,
      error: `الحد الأدنى لاستخدام هذا الرمز ${coupon.minOrderAmount} ريال.`,
    };
  }

  const discount =
    coupon.type === "PERCENT"
      ? round2(subtotal * (coupon.value / 100))
      : round2(coupon.value);

  // الخصم لا يتجاوز قيمة الطلب
  return { ok: true, discount: Math.min(discount, subtotal), code: normalized };
}

/** تكلفة الشحن حسب المدينة، مع مراعاة حد الشحن المجاني. */
export async function calculateShipping(city: string, orderValue: number): Promise<number> {
  const zones = await prisma.shippingZone.findMany({ where: { isActive: true } });

  const zone = zones.find((candidate) => {
    const cities = Array.isArray(candidate.cities) ? (candidate.cities as string[]) : [];
    return cities.includes(city);
  });

  // مدينة خارج المناطق المعرّفة: نأخذ أعلى تكلفة معرّفة بدل تجاهل الشحن
  if (!zone) {
    const fallback = zones.reduce<number>(
      (max, candidate) => Math.max(max, candidate.cost),
      0,
    );
    return round2(fallback);
  }

  if (zone.freeOverAmount !== null && orderValue >= zone.freeOverAmount) return 0;

  return round2(zone.cost);
}
