import type { FulfillmentMethod } from "@/lib/constants";
import { fromMinor, percentOfMinor, toMinor } from "@/lib/data/money";

/**
 * ============================================================================
 *  إجماليات الطلب — نقطة الحساب الوحيدة
 * ============================================================================
 *  وحدة خالصة (بلا قاعدة بيانات) يستعملها الخادم عند حفظ الطلب، ويمكن
 *  لصفحة الدفع استعمالها لعرض ملخّص حيّ قبل الإرسال. الخادم هو المرجع دائمًا:
 *  ما يعرضه المتصفّح تقدير، وما يُحفظ هو ما يحسبه الخادم من جديد.
 *
 *  ترتيب الحساب:
 *    الإجمالي الفرعي = مجموع إجماليات البنود
 *    الخصم            = قيمة الكوبون (لا تتجاوز الإجمالي الفرعي)
 *    الشحن            = حسب المنطقة، ومجاني فوق حدّ المنطقة (بعد الخصم)
 *    الأساس الخاضع    = الإجمالي الفرعي − الخصم + الشحن
 *    الضريبة          = مستخرَجة من الأساس إن كانت الأسعار شاملة، أو مضافة إليه
 *    الإجمالي         = الأساس (شاملة) أو الأساس + الضريبة (غير شاملة)
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// الخصم
// ---------------------------------------------------------------------------

export type CouponRule = {
  type: "PERCENT" | "FIXED";
  value: number;
};

/** قيمة الخصم بالريال، لا تتجاوز الإجمالي الفرعي ولا تقل عن صفر. */
export function computeDiscount(rule: CouponRule, subtotal: number): number {
  const subtotalMinor = toMinor(subtotal);

  const discountMinor =
    rule.type === "PERCENT"
      ? percentOfMinor(subtotalMinor, Math.min(Math.max(rule.value, 0), 100))
      : toMinor(Math.max(rule.value, 0));

  return fromMinor(Math.min(Math.max(discountMinor, 0), subtotalMinor));
}

// ---------------------------------------------------------------------------
// الشحن
// ---------------------------------------------------------------------------

export type ShippingZoneRule = {
  cities: unknown;
  cost: number;
  freeOverAmount: number | null;
};

/**
 * توحيد اسم المدينة للمقارنة: يتجاهل الهمزات والتشكيل والمسافات الزائدة
 * وياء/ألف مقصورة، فتتطابق «المدينة المنوّرة» مع «المدينة المنورة».
 */
export function normalizeCity(city: string): string {
  return city
    .normalize("NFKC")
    .replace(/[ً-ٰٟـ]/g, "") // التشكيل والتطويل
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * تكلفة الشحن. مدينة خارج المناطق المعرّفة تُحمَّل أعلى تكلفة معرّفة بدل
 * تجاهل الشحن (لا شحن مجاني بالخطأ)، ولا حدّ شحن مجاني لها.
 */
export function resolveShipping(input: {
  zones: readonly ShippingZoneRule[];
  fulfillment: FulfillmentMethod;
  city: string | null | undefined;
  /** قيمة الطلب بعد الخصم، تُقارن بحدّ الشحن المجاني. */
  orderValue: number;
}): number {
  const { zones, fulfillment, city, orderValue } = input;

  if (fulfillment !== "DELIVERY" || !city) return 0;

  const wanted = normalizeCity(city);
  const zone = zones.find((candidate) => {
    const cities = Array.isArray(candidate.cities) ? (candidate.cities as unknown[]) : [];
    return cities.some((entry) => typeof entry === "string" && normalizeCity(entry) === wanted);
  });

  if (!zone) {
    const highest = zones.reduce((max, candidate) => Math.max(max, toMinor(candidate.cost)), 0);
    return fromMinor(highest);
  }

  if (zone.freeOverAmount !== null && toMinor(orderValue) >= toMinor(zone.freeOverAmount)) {
    return 0;
  }

  return fromMinor(Math.max(0, toMinor(zone.cost)));
}

// ---------------------------------------------------------------------------
// الضريبة والإجمالي
// ---------------------------------------------------------------------------

export type OrderTotals = {
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  /** ما يخضع للضريبة: الإجمالي الفرعي − الخصم + الشحن. */
  taxableBase: number;
  vatAmount: number;
  total: number;
};

/** الضريبة المستخرَجة من مبلغ شامل لها (بالهللات). */
function extractVatMinor(grossMinor: number, vatRate: number): number {
  const scale = 1_000_000;
  const rate = Math.round(vatRate * scale);
  const net = Math.round((grossMinor * scale) / (scale + rate));
  return grossMinor - net;
}

export function computeOrderTotals(input: {
  /** إجماليات البنود بالريال. */
  lineTotals: readonly number[];
  discountAmount?: number;
  shippingCost?: number;
  vatRate: number;
  pricesIncludeVat: boolean;
}): OrderTotals {
  const subtotalMinor = input.lineTotals.reduce((sum, line) => sum + toMinor(line), 0);
  const discountMinor = Math.min(toMinor(input.discountAmount ?? 0), subtotalMinor);
  const shippingMinor = Math.max(0, toMinor(input.shippingCost ?? 0));

  const taxableMinor = subtotalMinor - discountMinor + shippingMinor;

  const vatMinor = input.pricesIncludeVat
    ? extractVatMinor(taxableMinor, input.vatRate)
    : percentOfMinor(taxableMinor, input.vatRate * 100);

  const totalMinor = input.pricesIncludeVat ? taxableMinor : taxableMinor + vatMinor;

  return {
    subtotal: fromMinor(subtotalMinor),
    discountAmount: fromMinor(discountMinor),
    shippingCost: fromMinor(shippingMinor),
    taxableBase: fromMinor(taxableMinor),
    vatAmount: fromMinor(vatMinor),
    total: fromMinor(totalMinor),
  };
}
