import { createHash } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { CHOICE_OPTION_TYPES } from "@/lib/constants";
import { redeemCoupon, validateCoupon } from "@/lib/data/coupons";
import { fromMinor, toMinor } from "@/lib/data/money";
import {
  computeOrderTotals,
  resolveShipping,
  type OrderTotals,
} from "@/lib/data/totals";
import {
  calculatePrice,
  describeSelection,
  toPricingProduct,
  type OptionSelection,
  type PricingOptionGroup,
} from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/reference";
import { getSettings } from "@/lib/settings";
import type { CheckoutData } from "@/lib/validation";

/**
 * ============================================================================
 *  إنشاء الطلبات
 * ============================================================================
 *  القاعدة الحاكمة: **لا يُقبل أي رقم يصل من المتصفّح**. ما يرسله العميل هو
 *  المنتج والخيارات والكمية والرمز الترويجي فقط. كل بند يُعاد تسعيره من
 *  القاعدة، وكذلك الخصم والشحن والضريبة (priceCart).
 *
 *  الحفظ (persistOrder) معاملة واحدة تضمن:
 *    • رقم طلب فريد من عدّاد ذرّي (لا تصادم بين طلبين متزامنين).
 *    • استهلاك الكوبون بشكل ذرّي (لا تجاوز لـ maxUses).
 *    • الطلب وبنوده وحدث «استلام الطلب» معًا أو لا شيء.
 *    • idempotency: النقر المزدوج أو إعادة الإرسال يعيد الطلب نفسه ولا
 *      ينشئ آخر.
 * ============================================================================
 */

export type OrderCreationResult =
  | {
      ok: true;
      orderNumber: string;
      total: number;
      orderId: string;
      /** true إن كان هذا الطلب مُنشأً سابقًا (إعادة إرسال/نقر مزدوج). */
      duplicate: boolean;
    }
  | { ok: false; error: string; field?: string };

export type CreateOrderOptions = {
  /** مفتاح من العميل (ترويسة Idempotency-Key). إن غاب يُشتقّ من بصمة الطلب. */
  idempotencyKey?: string;
};

// ---------------------------------------------------------------------------
// تسعير السلة (المرجع الوحيد للأرقام)
// ---------------------------------------------------------------------------

export type CartLineInput = {
  productId: string;
  quantity: number;
  /** مفتاح المجموعة ← معرّف القيمة أو نصّها (انظر resolveSelection). */
  selection: Record<string, string | string[]>;
  notes?: string;
};

export type CartInput = {
  items: CartLineInput[];
  fulfillment: "PICKUP" | "DELIVERY";
  city?: string | null;
  couponCode?: string | null;
};

export type PricedItem = {
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

export type CartQuote =
  | {
      ok: true;
      items: PricedItem[];
      totals: OrderTotals;
      coupon: { id: string; code: string; discount: number } | null;
    }
  | { ok: false; error: string; field?: string };

const MAX_LINES = 50;

/**
 * يحسب السلة كاملة من بيانات القاعدة: البنود والخصم والشحن والضريبة.
 * بلا كتابة — تصلح لمعاينة ملخّص الدفع قبل الإرسال وللحفظ الفعلي معًا.
 */
export async function priceCart(input: CartInput): Promise<CartQuote> {
  if (input.items.length === 0) return { ok: false, error: "السلة فارغة." };
  if (input.items.length > MAX_LINES) {
    return { ok: false, error: `السلة تحوي بنودًا كثيرة (الحد ${MAX_LINES}).` };
  }

  const [settings, products, zones] = await Promise.all([
    getSettings(),
    prisma.product.findMany({
      where: { id: { in: [...new Set(input.items.map((item) => item.productId))] }, isActive: true },
      include: {
        images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
        quantityTiers: { orderBy: { minQty: "asc" } },
        optionGroups: {
          orderBy: { order: "asc" },
          include: { values: { where: { isActive: true }, orderBy: { order: "asc" } } },
        },
      },
    }),
    prisma.shippingZone.findMany({ where: { isActive: true } }),
  ]);

  const byId = new Map(products.map((product) => [product.id, product]));
  const priced: PricedItem[] = [];

  for (const item of input.items) {
    const product = byId.get(item.productId);

    if (!product) {
      return {
        ok: false,
        error: "أحد المنتجات في سلتك لم يعد متوفرًا. حدّث السلة ثم أعد المحاولة.",
      };
    }

    if (product.priceMode === "QUOTE_ONLY") {
      return {
        ok: false,
        error: `المنتج "${product.name}" يحتاج عرض سعر ولا يمكن شراؤه مباشرة. احذفه من السلة وأرسل طلب عرض سعر.`,
      };
    }

    const pricing = toPricingProduct(product);
    const groups = pricing.optionGroups;
    const selection = resolveSelection(groups, item.selection);
    const breakdown = calculatePrice(pricing, selection, item.quantity);

    if (!breakdown.priceable) {
      return { ok: false, error: `تعذّر حساب سعر المنتج "${product.name}".` };
    }

    if (breakdown.missingRequired.length > 0) {
      const names = breakdown.missingRequired
        .map((key) => groups.find((group) => group.key === key)?.name)
        .filter(Boolean)
        .join("، ");
      return {
        ok: false,
        error: `المنتج "${product.name}" ينقصه: ${names}. افتح صفحة المنتج وأكمل الخيارات.`,
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

  const subtotal = fromMinor(priced.reduce((sum, item) => sum + toMinor(item.lineTotal), 0));

  // --- الكوبون ---
  let coupon: { id: string; code: string; discount: number } | null = null;
  if (input.couponCode?.trim()) {
    const check = await validateCoupon(input.couponCode, subtotal);
    if (!check.ok) return { ok: false, error: check.error, field: "couponCode" };
    coupon = { id: check.couponId, code: check.code, discount: check.discount };
  }

  // --- الشحن (يُقارَن حدّ الشحن المجاني بقيمة الطلب بعد الخصم) ---
  const shippingCost = resolveShipping({
    zones,
    fulfillment: input.fulfillment,
    city: input.city,
    orderValue: subtotal - (coupon?.discount ?? 0),
  });

  const totals = computeOrderTotals({
    lineTotals: priced.map((item) => item.lineTotal),
    discountAmount: coupon?.discount ?? 0,
    shippingCost,
    vatRate: settings.vatRate,
    pricesIncludeVat: settings.pricesIncludeVat,
  });

  return { ok: true, items: priced, totals, coupon };
}

// ---------------------------------------------------------------------------
// الخيارات المختارة
// ---------------------------------------------------------------------------

const MAX_FREE_TEXT = 500;

/**
 * يحوّل ما يرسله المتصفّح إلى اختيار صالح لهذا المنتج فقط.
 *
 * • يقبل معرّف القيمة، أو نصّها (value) أو تسميتها (label) — السلة تحفظ
 *   النصوص لا المعرّفات، وعدم قبولها كان يُسقط كل الخيارات فيُسعَّر الطلب
 *   بالسعر الأساسي ويُرفض أي منتج فيه مجموعة إلزامية.
 * • أي قيمة لا تنتمي لقيم هذا المنتج الفعّالة تُهمَل: لا يمكن حقن معرّف قيمة
 *   من منتج آخر أرخص للتأثير على السعر.
 * • الحقول الحرّة (نص/رقم/تاريخ) تُقصّ إلى ٥٠٠ حرف.
 */
export function resolveSelection(
  groups: PricingOptionGroup[],
  incoming: Record<string, string | string[]>,
): OptionSelection {
  const clean: OptionSelection = {};

  for (const group of groups) {
    const raw = incoming[group.key];
    if (raw === undefined || raw === null) continue;

    if (!CHOICE_OPTION_TYPES.includes(group.type)) {
      if (typeof raw === "string" && raw.trim()) {
        clean[group.key] = raw.trim().slice(0, MAX_FREE_TEXT);
      }
      continue;
    }

    const active = group.values.filter((value) => value.isActive);
    const find = (token: string) =>
      active.find((value) => value.id === token) ??
      active.find((value) => value.value === token) ??
      active.find((value) => value.label === token);

    const tokens = (Array.isArray(raw) ? raw : [raw]).map((token) => token.trim());
    const matched = new Set<string>();

    for (const token of tokens) {
      if (!token) continue;
      const exact = find(token);
      if (exact) {
        matched.add(exact.id);
      } else if (group.type === "CHECKBOX" && token.includes("،")) {
        // describeSelection يجمع القيم المتعددة بـ «، » في نص واحد
        for (const part of token.split("،")) {
          const hit = find(part.trim());
          if (hit) matched.add(hit.id);
        }
      }
    }

    if (matched.size === 0) continue;

    const ids = [...matched];
    clean[group.key] = group.type === "CHECKBOX" ? ids : ids[0];
  }

  return clean;
}

// ---------------------------------------------------------------------------
// إنشاء الطلب
// ---------------------------------------------------------------------------

/**
 * بصمة الطلب: نفس العميل ونفس المحتوى ونفس التوصيل والدفع ← نفس البصمة.
 * تُستعمل مفتاح idempotency احتياطيًا حين لا يرسل العميل مفتاحًا.
 */
function fingerprint(data: CheckoutData): string {
  const lines = data.items
    .map((item) => ({
      p: item.productId,
      q: item.quantity,
      s: Object.entries(item.selection)
        .map(([key, value]) => [key, Array.isArray(value) ? [...value].sort() : value])
        .sort(([a], [b]) => String(a).localeCompare(String(b))),
    }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  return createHash("sha256")
    .update(
      JSON.stringify([
        data.customerPhone,
        data.fulfillment,
        data.city ?? "",
        data.paymentMethod,
        data.couponCode?.trim().toUpperCase() ?? "",
        lines,
      ]),
    )
    .digest("hex")
    .slice(0, 32);
}

/** نافذة الاحتياط الآلي: ضغطتان خلال هذه المدة تُعدّان طلبًا واحدًا. */
const AUTO_KEY_WINDOW_MS = 60_000;

function autoKeys(print: string, now: number): string[] {
  const bucket = Math.floor(now / AUTO_KEY_WINDOW_MS);
  // الدلو الحالي والسابق: يغطّي النقر المزدوج المتقاطع مع حدّ الدقيقة
  return [`auto:${print}:${bucket}`, `auto:${print}:${bucket - 1}`];
}

const EXPLICIT_KEY = /^[A-Za-z0-9._:-]{8,100}$/;

type ExistingOrder = { id: string; orderNumber: string; total: number; customerPhone: string };

async function findByKeys(keys: string[]): Promise<ExistingOrder | null> {
  return prisma.order.findFirst({
    where: { idempotencyKey: { in: keys } },
    select: { id: true, orderNumber: true, total: true, customerPhone: true },
  });
}

function duplicateResult(order: ExistingOrder): OrderCreationResult {
  return {
    ok: true,
    orderNumber: order.orderNumber,
    total: order.total,
    orderId: order.id,
    duplicate: true,
  };
}

/** يمنع تفويض مفتاح عميل آخر: المفتاح المكرّر يجب أن يخصّ نفس الجوال. */
const KEY_MISMATCH: OrderCreationResult = {
  ok: false,
  error: "تعذّر إتمام الطلب. أعد تحميل الصفحة وحاول مرة أخرى.",
};

export class OrderAbort extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

export async function createOrder(
  data: CheckoutData,
  options: CreateOrderOptions = {},
): Promise<OrderCreationResult> {
  const now = Date.now();

  // --- ١. مفتاح التكرار ---
  const explicit = options.idempotencyKey?.trim();
  if (explicit && !EXPLICIT_KEY.test(explicit)) {
    return { ok: false, error: "مفتاح الطلب غير صالح." };
  }

  const print = fingerprint(data);
  const lookupKeys = explicit ? [`c:${explicit}`] : autoKeys(print, now);
  const writeKey = explicit ? `c:${explicit}` : lookupKeys[0];

  const existing = await findByKeys(lookupKeys);
  if (existing) {
    return existing.customerPhone === data.customerPhone ? duplicateResult(existing) : KEY_MISMATCH;
  }

  // --- ٢. إعادة تسعير كاملة من القاعدة ---
  const quote = await priceCart({
    items: data.items,
    fulfillment: data.fulfillment,
    city: data.city,
    couponCode: data.couponCode,
  });
  if (!quote.ok) return quote;

  // --- ٣. الحفظ في معاملة واحدة ---
  try {
    const created = await prisma.$transaction(
      async (tx) => {
        const orderNumber = await generateOrderNumber(tx);

        // الكوبون يُستهلك هنا بشكل ذرّي — قد يكون استُنفد بين المعاينة والحفظ
        if (quote.coupon) {
          const redeemed = await redeemCoupon(tx, quote.coupon.id, quote.totals.subtotal);
          if (!redeemed.ok) throw new OrderAbort(redeemed.error, "couponCode");
        }

        // سجل عميل واحد لكل رقم جوال — يبني سجل العملاء تلقائيًا
        const customer = await tx.customer.upsert({
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

        return tx.order.create({
          data: {
            orderNumber,
            idempotencyKey: writeKey,
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
            subtotal: quote.totals.subtotal,
            discountAmount: quote.totals.discountAmount,
            couponCode: quote.coupon?.code ?? null,
            shippingCost: quote.totals.shippingCost,
            vatAmount: quote.totals.vatAmount,
            total: quote.totals.total,
            notes: data.notes,
            items: {
              create: quote.items.map((item) => ({
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
            events: {
              create: {
                kind: "STATUS",
                fromStatus: null,
                toStatus: "NEW",
                note: "تم استلام طلبك وهو قيد المراجعة.",
                actorType: "CUSTOMER",
                actorName: data.customerName,
                isPublic: true,
              },
            },
          },
          select: { id: true, orderNumber: true, total: true },
        });
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    return {
      ok: true,
      orderNumber: created.orderNumber,
      total: created.total,
      orderId: created.id,
      duplicate: false,
    };
  } catch (error) {
    if (error instanceof OrderAbort) {
      return { ok: false, error: error.message, field: error.field };
    }

    // نقرتان متزامنتان بالمفتاح نفسه: الثانية تصطدم بالقيد الفريد (P2002)
    // فتعيد الطلب الذي أنشأته الأولى بدل خطأ.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await findByKeys([writeKey]);
      if (winner) {
        return winner.customerPhone === data.customerPhone
          ? duplicateResult(winner)
          : KEY_MISMATCH;
      }
    }

    console.error("[orders] فشل إنشاء الطلب:", error);
    return { ok: false, error: "تعذّر حفظ الطلب. حاول مرة أخرى أو تواصل معنا عبر واتساب." };
  }
}

// ---------------------------------------------------------------------------
// الشحن (للاستعمال المباشر من الصفحات)
// ---------------------------------------------------------------------------

/** تكلفة الشحن حسب المدينة، مع مراعاة حد الشحن المجاني. */
export async function calculateShipping(city: string, orderValue: number): Promise<number> {
  const zones = await prisma.shippingZone.findMany({ where: { isActive: true } });
  return resolveShipping({ zones, fulfillment: "DELIVERY", city, orderValue });
}
