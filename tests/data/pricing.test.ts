/**
 * اختبارات محرّك التسعير والإجماليات — وحدات خالصة بلا قاعدة بيانات.
 *
 * التشغيل:  npx tsx --test tests/data/*.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fromMinor, isExactMoney, multiplyMinor, roundMoney, toMinor } from "@/lib/data/money";
import {
  allowedNextStatuses,
  checkOrderTransition,
  checkPaymentTransition,
  paymentSideEffect,
} from "@/lib/data/order-state";
import {
  computeDiscount,
  computeOrderTotals,
  normalizeCity,
  resolveShipping,
} from "@/lib/data/totals";
import {
  calculatePrice,
  calculateStartingPrice,
  findTier,
  MAX_ORDER_QUANTITY,
  normalizeQuantity,
  type PricingOptionGroup,
  type PricingProduct,
} from "@/lib/pricing";

function value(
  id: string,
  priceModifier: number,
  priceMode: PricingOptionGroup["values"][number]["priceMode"],
  extra: Partial<PricingOptionGroup["values"][number]> = {},
): PricingOptionGroup["values"][number] {
  return {
    id,
    label: id,
    value: id,
    priceModifier,
    priceMode,
    isDefault: false,
    isActive: true,
    ...extra,
  };
}

function group(
  key: string,
  values: PricingOptionGroup["values"],
  extra: Partial<PricingOptionGroup> = {},
): PricingOptionGroup {
  return { id: `g-${key}`, key, name: key, type: "SELECT", isRequired: true, values, ...extra };
}

const cards: PricingProduct = {
  priceMode: "STARTS_FROM",
  basePrice: 0.5,
  minQuantity: 100,
  quantityStep: 100,
  quantityTiers: [
    { minQty: 100, maxQty: 499, unitPrice: 0.45, label: "١٠٠" },
    { minQty: 500, maxQty: 999, unitPrice: 0.3, label: "٥٠٠" },
    { minQty: 1000, maxQty: null, unitPrice: 0.2, label: "١٠٠٠" },
  ],
  optionGroups: [],
};

describe("money", () => {
  it("rounds half away from zero and ignores float noise", () => {
    assert.equal(toMinor(1.005), 101);
    assert.equal(toMinor(0.1 + 0.2), 30);
    assert.equal(toMinor(-1.005), -101);
    assert.equal(toMinor(Number.NaN), 0);
    assert.equal(roundMoney(2.675), 2.68);
    assert.equal(fromMinor(1999), 19.99);
  });

  it("detects values that are not exact halala multiples", () => {
    assert.equal(isExactMoney(19.99), true);
    assert.equal(isExactMoney(0.1 + 0.2), true);
    assert.equal(isExactMoney(19.999), false);
  });

  it("multiplies with deterministic rounding", () => {
    assert.equal(multiplyMinor(450, 1.35), 608); // 6.075 → 6.08
    assert.equal(multiplyMinor(100, 1.25), 125);
  });
});

describe("findTier", () => {
  it("picks the tier with the largest minQty not above the quantity", () => {
    assert.equal(findTier(cards.quantityTiers, 100)?.unitPrice, 0.45);
    assert.equal(findTier(cards.quantityTiers, 499)?.unitPrice, 0.45);
    assert.equal(findTier(cards.quantityTiers, 500)?.unitPrice, 0.3);
    assert.equal(findTier(cards.quantityTiers, 5000)?.unitPrice, 0.2);
  });

  it("is order independent", () => {
    const shuffled = [...cards.quantityTiers].reverse();
    assert.equal(findTier(shuffled, 700)?.unitPrice, 0.3);
  });

  it("returns null below the first tier", () => {
    assert.equal(findTier(cards.quantityTiers, 50), null);
  });

  it("never raises the unit price when quantity exceeds a closed last tier", () => {
    const closed = [
      { minQty: 1, maxQty: 99, unitPrice: 5, label: null },
      { minQty: 100, maxQty: 499, unitPrice: 4, label: null },
    ];
    assert.equal(findTier(closed, 600)?.unitPrice, 4);
  });

  it("keeps the previous tier across a gap between tiers", () => {
    const gap = [
      { minQty: 1, maxQty: 99, unitPrice: 5, label: null },
      { minQty: 101, maxQty: null, unitPrice: 4, label: null },
    ];
    assert.equal(findTier(gap, 100)?.unitPrice, 5);
    assert.equal(findTier(gap, 101)?.unitPrice, 4);
  });
});

describe("normalizeQuantity", () => {
  const rule = { minQuantity: 100, quantityStep: 100 };

  it("clamps to the minimum and snaps up to the next valid step", () => {
    assert.equal(normalizeQuantity(rule, 1), 100);
    assert.equal(normalizeQuantity(rule, 100), 100);
    assert.equal(normalizeQuantity(rule, 101), 200);
    assert.equal(normalizeQuantity(rule, 250), 300);
    assert.equal(normalizeQuantity(rule, 300), 300);
  });

  it("handles invalid input", () => {
    assert.equal(normalizeQuantity(rule, Number.NaN), 100);
    assert.equal(normalizeQuantity(rule, -5), 100);
    assert.equal(normalizeQuantity(rule, Infinity), 100);
    assert.equal(normalizeQuantity({ minQuantity: 0, quantityStep: 0 }, 7.9), 7);
  });

  it("respects the upper bound on a step lattice", () => {
    const result = normalizeQuantity(rule, 99_999_999);
    assert.ok(result <= MAX_ORDER_QUANTITY);
    assert.equal((result - 100) % 100, 0);
  });

  it("supports a minimum that is not a multiple of the step", () => {
    const odd = { minQuantity: 25, quantityStep: 50 };
    assert.equal(normalizeQuantity(odd, 26), 75);
    assert.equal(normalizeQuantity(odd, 75), 75);
  });
});

describe("calculatePrice", () => {
  it("uses the tier price and totals in exact halalas", () => {
    const result = calculatePrice(cards, {}, 500);
    assert.equal(result.unitPrice, 0.3);
    assert.equal(result.total, 150);
    assert.equal(result.tierLabel, "٥٠٠");
  });

  it("falls back to basePrice below the first tier", () => {
    const product: PricingProduct = { ...cards, minQuantity: 1, quantityStep: 1 };
    assert.equal(calculatePrice(product, {}, 10).unitPrice, 0.5);
  });

  it("applies override, then per-unit adds, then multipliers, then flat fees", () => {
    const product: PricingProduct = {
      ...cards,
      basePrice: 10,
      minQuantity: 1,
      quantityStep: 1,
      quantityTiers: [],
      optionGroups: [
        group("size", [value("big", 2, "ADD_PER_UNIT")]),
        group("sides", [value("two", 1.5, "MULTIPLY")]),
        group("die", [value("custom", 350, "ADD")]),
      ],
    };
    const result = calculatePrice(product, { size: "big", sides: "two", die: "custom" }, 10);
    // (10 + 2) × 1.5 = 18 للوحدة؛ ×10 = 180؛ + 350 رسوم ثابتة
    assert.equal(result.unitPrice, 18);
    assert.equal(result.flatFees, 350);
    assert.equal(result.total, 530);
  });

  it("OVERRIDE_UNIT replaces the tier price entirely", () => {
    const product: PricingProduct = {
      ...cards,
      optionGroups: [group("paper", [value("premium", 1, "OVERRIDE_UNIT")])],
    };
    assert.equal(calculatePrice(product, { paper: "premium" }, 1000).unitPrice, 1);
  });

  it("never produces a negative unit price or flat fee", () => {
    const product: PricingProduct = {
      ...cards,
      basePrice: 1,
      quantityTiers: [],
      optionGroups: [
        group("promo", [value("deep", -5, "ADD_PER_UNIT")]),
        group("credit", [value("c", -50, "ADD")]),
      ],
    };
    const result = calculatePrice(product, { promo: "deep", credit: "c" }, 100);
    assert.equal(result.unitPrice, 0);
    assert.equal(result.flatFees, 0);
    assert.equal(result.total, 0);
  });

  it("ignores inactive and foreign values", () => {
    const product: PricingProduct = {
      ...cards,
      basePrice: 1,
      quantityTiers: [],
      optionGroups: [
        group("x", [value("off", 100, "ADD_PER_UNIT", { isActive: false })], {
          isRequired: false,
        }),
      ],
    };
    assert.equal(calculatePrice(product, { x: "off" }, 100).unitPrice, 1);
    assert.equal(calculatePrice(product, { x: "does-not-exist" }, 100).unitPrice, 1);
  });

  it("reports missing required groups, including free-text ones, but not FILE", () => {
    const product: PricingProduct = {
      ...cards,
      optionGroups: [
        group("paper", [value("a", 0, "ADD_PER_UNIT")]),
        group("size", [], { type: "TEXT" }),
        group("design", [], { type: "FILE" }),
      ],
    };
    assert.deepEqual(calculatePrice(product, {}, 100).missingRequired, ["paper", "size"]);
    assert.deepEqual(
      calculatePrice(product, { paper: "a", size: "  10×20 " }, 100).missingRequired,
      [],
    );
    // مسافات فقط = ناقص
    assert.deepEqual(calculatePrice(product, { paper: "a", size: "   " }, 100).missingRequired, [
      "size",
    ]);
  });

  it("does not price QUOTE_ONLY products", () => {
    const result = calculatePrice({ ...cards, priceMode: "QUOTE_ONLY" }, {}, 100);
    assert.equal(result.priceable, false);
    assert.equal(result.total, 0);
  });

  it("totals are exact for awkward decimals (no float drift)", () => {
    const product: PricingProduct = {
      ...cards,
      basePrice: 0.1,
      minQuantity: 1,
      quantityStep: 1,
      quantityTiers: [],
      optionGroups: [group("a", [value("a", 0.2, "ADD_PER_UNIT")])],
    };
    const result = calculatePrice(product, { a: "a" }, 3);
    assert.equal(result.unitPrice, 0.3);
    assert.equal(result.total, 0.9);
  });
});

describe("calculateStartingPrice", () => {
  it("finds the cheapest combination using real computation", () => {
    const product: PricingProduct = {
      ...cards,
      basePrice: 10,
      minQuantity: 1,
      quantityStep: 1,
      quantityTiers: [],
      optionGroups: [
        // ضرب ×0.5 يجعل الإضافة الأغلى أرخص في النهاية مما يظنّه التقدير الساذج
        group("promo", [value("none", 0, "ADD_PER_UNIT"), value("half", 0.5, "MULTIPLY")]),
        group("extra", [value("a", 4, "ADD_PER_UNIT"), value("b", 6, "ADD_PER_UNIT")]),
      ],
    };
    // أرخص: half (×0.5) مع extra=a ← (10 + 4) × 0.5 = 7
    assert.equal(calculateStartingPrice(product), 7);
  });

  it("returns null for quote-only products and skips optional groups", () => {
    assert.equal(calculateStartingPrice({ ...cards, priceMode: "QUOTE_ONLY" }), null);
    const optional: PricingProduct = {
      ...cards,
      optionGroups: [group("x", [value("v", 50, "ADD_PER_UNIT")], { isRequired: false })],
    };
    assert.equal(calculateStartingPrice(optional), 0.45);
  });
});

describe("totals", () => {
  it("extracts VAT from inclusive prices", () => {
    const totals = computeOrderTotals({
      lineTotals: [100],
      vatRate: 0.15,
      pricesIncludeVat: true,
    });
    assert.equal(totals.total, 100);
    assert.equal(totals.vatAmount, 13.04); // 100 − 100/1.15
  });

  it("adds VAT to exclusive prices", () => {
    const totals = computeOrderTotals({
      lineTotals: [100],
      shippingCost: 25,
      vatRate: 0.15,
      pricesIncludeVat: false,
    });
    assert.equal(totals.vatAmount, 18.75);
    assert.equal(totals.total, 143.75);
  });

  it("subtotal equals the sum of lines exactly", () => {
    const totals = computeOrderTotals({
      lineTotals: [0.1, 0.2, 0.3],
      vatRate: 0.15,
      pricesIncludeVat: true,
    });
    assert.equal(totals.subtotal, 0.6);
  });

  it("caps the discount at the subtotal", () => {
    const totals = computeOrderTotals({
      lineTotals: [50],
      discountAmount: 80,
      vatRate: 0.15,
      pricesIncludeVat: true,
    });
    assert.equal(totals.discountAmount, 50);
    assert.equal(totals.total, 0);
  });

  it("computes percent and fixed discounts defensively", () => {
    assert.equal(computeDiscount({ type: "PERCENT", value: 10 }, 199.99), 20);
    assert.equal(computeDiscount({ type: "PERCENT", value: 250 }, 100), 100);
    assert.equal(computeDiscount({ type: "FIXED", value: 30 }, 20), 20);
    assert.equal(computeDiscount({ type: "FIXED", value: -5 }, 20), 0);
  });
});

describe("shipping", () => {
  const zones = [
    { cities: ["الرياض", "المدينة المنورة"], cost: 25, freeOverAmount: 500 },
    { cities: ["حائل"], cost: 45, freeOverAmount: null },
  ];

  it("matches cities regardless of hamza and diacritics", () => {
    assert.equal(normalizeCity("  أبها "), normalizeCity("ابها"));
    assert.equal(
      resolveShipping({ zones, fulfillment: "DELIVERY", city: "المدينة المنوّرة", orderValue: 10 }),
      25,
    );
  });

  it("is free at or above the threshold and for pickup", () => {
    assert.equal(resolveShipping({ zones, fulfillment: "DELIVERY", city: "الرياض", orderValue: 500 }), 0);
    assert.equal(resolveShipping({ zones, fulfillment: "DELIVERY", city: "الرياض", orderValue: 499.99 }), 25);
    assert.equal(resolveShipping({ zones, fulfillment: "PICKUP", city: "الرياض", orderValue: 1 }), 0);
  });

  it("charges the highest zone for unknown cities, never free", () => {
    assert.equal(
      resolveShipping({ zones, fulfillment: "DELIVERY", city: "مدينة جديدة", orderValue: 99999 }),
      45,
    );
  });
});

describe("order state machine", () => {
  const base = {
    fulfillment: "DELIVERY" as const,
    paymentMethod: "BANK_TRANSFER" as const,
    paymentStatus: "PAID" as const,
  };

  it("allows the happy path for delivery orders", () => {
    const path = ["NEW", "CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED"] as const;
    for (let i = 1; i < path.length; i += 1) {
      assert.deepEqual(checkOrderTransition({ ...base, from: path[i - 1], to: path[i] }), { ok: true });
    }
  });

  it("rejects skipping steps and leaving final states", () => {
    const skip = checkOrderTransition({ ...base, from: "NEW", to: "DELIVERED" });
    assert.equal(skip.ok, false);
    const reopen = checkOrderTransition({ ...base, from: "CANCELLED", to: "NEW" });
    assert.equal(!reopen.ok && reopen.code, "FINAL_STATUS");
    assert.equal(checkOrderTransition({ ...base, from: "NEW", to: "NEW" }).ok, false);
  });

  it("pickup skips SHIPPED and delivery cannot skip it", () => {
    assert.ok(!allowedNextStatuses("READY", "PICKUP").includes("SHIPPED"));
    assert.ok(allowedNextStatuses("READY", "PICKUP").includes("DELIVERED"));
    assert.ok(!allowedNextStatuses("READY", "DELIVERY").includes("DELIVERED"));
  });

  it("cannot cancel after shipping", () => {
    assert.equal(checkOrderTransition({ ...base, from: "SHIPPED", to: "CANCELLED" }).ok, false);
  });

  it("blocks delivering an unpaid prepaid order but not cash on delivery", () => {
    const unpaid = checkOrderTransition({
      ...base,
      fulfillment: "PICKUP",
      paymentStatus: "PENDING",
      from: "READY",
      to: "DELIVERED",
    });
    assert.equal(!unpaid.ok && unpaid.code, "UNPAID_DELIVERY");

    const cod = checkOrderTransition({
      ...base,
      fulfillment: "PICKUP",
      paymentMethod: "ON_PICKUP",
      paymentStatus: "PENDING",
      from: "READY",
      to: "DELIVERED",
    });
    assert.equal(cod.ok, true);
    assert.equal(paymentSideEffect("DELIVERED", "ON_PICKUP", "PENDING"), "PAID");
    assert.equal(paymentSideEffect("DELIVERED", "BANK_TRANSFER", "PENDING"), null);
  });

  it("restricts payment transitions", () => {
    assert.equal(checkPaymentTransition({ from: "PENDING", to: "PAID", orderStatus: "NEW" }).ok, true);
    assert.equal(checkPaymentTransition({ from: "PENDING", to: "REFUNDED", orderStatus: "NEW" }).ok, false);
    assert.equal(checkPaymentTransition({ from: "REFUNDED", to: "PAID", orderStatus: "NEW" }).ok, false);
    assert.equal(checkPaymentTransition({ from: "PENDING", to: "PAID", orderStatus: "CANCELLED" }).ok, false);
    assert.equal(checkPaymentTransition({ from: "PAID", to: "REFUNDED", orderStatus: "CANCELLED" }).ok, true);
  });
});
