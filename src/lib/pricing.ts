import {
  CHOICE_OPTION_TYPES,
  type OptionPriceMode,
  type OptionType,
  type PriceMode,
} from "@/lib/constants";
import { round2 } from "@/lib/utils";

/**
 * ============================================================================
 *  محرّك التسعير
 * ============================================================================
 *  وحدة خالصة (pure) بلا أي اعتماد على React أو Prisma، لأنها تعمل في مكانين:
 *
 *    • في المتصفّح — لعرض السعر لحظيًا أثناء تغيير الخيارات.
 *    • على الخادم — لإعادة حساب كل بند قبل حفظ الطلب.
 *
 *  إعادة الحساب على الخادم إلزامية: أسعار السلة تصل من المتصفّح ولا يجوز
 *  الوثوق بها إطلاقًا، فالمشتري قادر على تعديلها.
 *
 *  ترتيب تطبيق المعدّلات (مهم — التغيير هنا يغيّر كل الأسعار):
 *    ١. سعر الوحدة الأساس = شريحة الكمية المطابقة، أو basePrice إن لم توجد.
 *    ٢. OVERRIDE_UNIT   — يستبدل سعر الوحدة بالكامل.
 *    ٣. ADD_PER_UNIT    — تُجمع وتُضاف لسعر الوحدة.
 *    ٤. MULTIPLY        — تُضرب في سعر الوحدة بعد الإضافات.
 *    ٥. الإجمالي = سعر الوحدة × الكمية + مجموع معدّلات ADD (رسوم ثابتة للطلب).
 * ============================================================================
 */

export type PricingOptionValue = {
  id: string;
  label: string;
  value: string;
  priceModifier: number;
  priceMode: OptionPriceMode;
  isDefault: boolean;
  isActive: boolean;
};

export type PricingOptionGroup = {
  id: string;
  key: string;
  name: string;
  type: OptionType;
  isRequired: boolean;
  values: PricingOptionValue[];
};

export type PricingQuantityTier = {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  label: string | null;
};

export type PricingProduct = {
  priceMode: PriceMode;
  basePrice: number;
  minQuantity: number;
  quantityStep: number;
  optionGroups: PricingOptionGroup[];
  quantityTiers: PricingQuantityTier[];
};

/** الخيارات المختارة: مفتاح المجموعة ← معرّف القيمة (أو مصفوفة معرّفات لـ CHECKBOX). */
export type OptionSelection = Record<string, string | string[]>;

export type PriceLine = {
  label: string;
  amount: number;
  kind: "base" | "per-unit" | "multiplier" | "flat";
};

export type PriceBreakdown = {
  /** false للمنتجات التي لا تُسعّر إلا بعرض سعر. */
  priceable: boolean;
  unitPrice: number;
  quantity: number;
  /** إجمالي البند = سعر الوحدة × الكمية + الرسوم الثابتة. */
  total: number;
  /** مجموع الرسوم التي تُحتسب مرة واحدة للطلب. */
  flatFees: number;
  /** اسم شريحة الكمية المطبَّقة، إن وُجدت. */
  tierLabel: string | null;
  /** تفصيل يُعرض للعميل تحت السعر. */
  lines: PriceLine[];
  /** مفاتيح المجموعات الإلزامية التي لم تُختر بعد. */
  missingRequired: string[];
};

/** إيجاد شريحة الكمية المطابقة. */
export function findTier(
  tiers: PricingQuantityTier[],
  quantity: number,
): PricingQuantityTier | null {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let match: PricingQuantityTier | null = null;
  for (const tier of sorted) {
    const withinMin = quantity >= tier.minQty;
    const withinMax = tier.maxQty === null || quantity <= tier.maxQty;
    // نأخذ آخر شريحة يتجاوزها الحد الأدنى، فالشرائح مرتّبة تصاعديًا
    if (withinMin && withinMax) match = tier;
    else if (withinMin && tier.maxQty !== null && quantity > tier.maxQty) continue;
  }
  return match;
}

/** استخراج القيم المختارة فعليًا من مجموعة خيارات. */
function selectedValues(
  group: PricingOptionGroup,
  selection: OptionSelection,
): PricingOptionValue[] {
  if (!CHOICE_OPTION_TYPES.includes(group.type)) return [];

  const picked = selection[group.key];
  if (picked === undefined || picked === null) return [];

  const ids = Array.isArray(picked) ? picked : [picked];
  return group.values.filter((v) => v.isActive && ids.includes(v.id));
}

/** حساب سعر البند بالكامل. */
export function calculatePrice(
  product: PricingProduct,
  selection: OptionSelection,
  requestedQuantity: number,
): PriceBreakdown {
  const quantity = normalizeQuantity(product, requestedQuantity);

  const missingRequired = product.optionGroups
    .filter((g) => g.isRequired && CHOICE_OPTION_TYPES.includes(g.type))
    .filter((g) => selectedValues(g, selection).length === 0)
    .map((g) => g.key);

  if (product.priceMode === "QUOTE_ONLY") {
    return {
      priceable: false,
      unitPrice: 0,
      quantity,
      total: 0,
      flatFees: 0,
      tierLabel: null,
      lines: [],
      missingRequired,
    };
  }

  const tier = findTier(product.quantityTiers, quantity);
  let unitPrice = tier ? tier.unitPrice : product.basePrice;

  const lines: PriceLine[] = [
    {
      label: tier?.label ?? "سعر الوحدة",
      amount: unitPrice,
      kind: "base",
    },
  ];

  // ١. الاستبدال الكامل لسعر الوحدة
  for (const group of product.optionGroups) {
    for (const value of selectedValues(group, selection)) {
      if (value.priceMode === "OVERRIDE_UNIT") {
        unitPrice = value.priceModifier;
        lines.length = 0;
        lines.push({
          label: `${group.name}: ${value.label}`,
          amount: unitPrice,
          kind: "base",
        });
      }
    }
  }

  // ٢. الإضافات على سعر الوحدة
  for (const group of product.optionGroups) {
    for (const value of selectedValues(group, selection)) {
      if (value.priceMode === "ADD_PER_UNIT" && value.priceModifier !== 0) {
        unitPrice += value.priceModifier;
        lines.push({
          label: `${group.name}: ${value.label}`,
          amount: value.priceModifier,
          kind: "per-unit",
        });
      }
    }
  }

  // ٣. المضاعِفات
  for (const group of product.optionGroups) {
    for (const value of selectedValues(group, selection)) {
      if (value.priceMode === "MULTIPLY" && value.priceModifier > 0) {
        const before = unitPrice;
        unitPrice *= value.priceModifier;
        lines.push({
          label: `${group.name}: ${value.label}`,
          amount: round2(unitPrice - before),
          kind: "multiplier",
        });
      }
    }
  }

  // ٤. الرسوم الثابتة للطلب
  let flatFees = 0;
  for (const group of product.optionGroups) {
    for (const value of selectedValues(group, selection)) {
      if (value.priceMode === "ADD" && value.priceModifier !== 0) {
        flatFees += value.priceModifier;
        lines.push({
          label: `${group.name}: ${value.label}`,
          amount: value.priceModifier,
          kind: "flat",
        });
      }
    }
  }

  unitPrice = round2(Math.max(0, unitPrice));
  flatFees = round2(Math.max(0, flatFees));

  return {
    priceable: true,
    unitPrice,
    quantity,
    total: round2(unitPrice * quantity + flatFees),
    flatFees,
    tierLabel: tier?.label ?? null,
    lines,
    missingRequired,
  };
}

/**
 * أقل سعر ممكن للمنتج — يُعرض كـ "يبدأ من".
 * يُحسب بأرخص خيار في كل مجموعة إلزامية عند الحد الأدنى للكمية.
 */
export function calculateStartingPrice(product: PricingProduct): number | null {
  if (product.priceMode === "QUOTE_ONLY") return null;

  const cheapestSelection: OptionSelection = {};

  for (const group of product.optionGroups) {
    if (!CHOICE_OPTION_TYPES.includes(group.type)) continue;
    // الخيارات غير الإلزامية تُترك فارغة لأنها لا تُحتسب في "يبدأ من"
    if (!group.isRequired) continue;

    const active = group.values.filter((v) => v.isActive);
    if (active.length === 0) continue;

    const cheapest = active.reduce((min, v) =>
      effectiveCost(v) < effectiveCost(min) ? v : min,
    );
    cheapestSelection[group.key] = cheapest.id;
  }

  const result = calculatePrice(product, cheapestSelection, product.minQuantity);
  return result.priceable ? result.unitPrice : null;
}

/** تكلفة تقريبية لقيمة خيار — تُستخدم فقط للمقارنة بين الخيارات. */
function effectiveCost(value: PricingOptionValue): number {
  switch (value.priceMode) {
    case "OVERRIDE_UNIT":
      return value.priceModifier;
    case "MULTIPLY":
      // 1.0 يعني بلا تغيير؛ نحوّلها لمقياس قابل للمقارنة مع الإضافات
      return (value.priceModifier - 1) * 100;
    default:
      return value.priceModifier;
  }
}

/** تثبيت الكمية على الحد الأدنى وعلى مضاعفات خطوة الكمية. */
export function normalizeQuantity(
  product: Pick<PricingProduct, "minQuantity" | "quantityStep">,
  quantity: number,
): number {
  const min = Math.max(1, product.minQuantity || 1);
  const step = Math.max(1, product.quantityStep || 1);

  if (!Number.isFinite(quantity)) return min;

  const clamped = Math.max(min, Math.floor(quantity));
  // تقريب لأقرب مضاعف صحيح للخطوة ابتداءً من الحد الأدنى
  const stepsAboveMin = Math.round((clamped - min) / step);
  return min + Math.max(0, stepsAboveMin) * step;
}

/** الخيارات الافتراضية عند فتح صفحة المنتج لأول مرة. */
export function defaultSelection(groups: PricingOptionGroup[]): OptionSelection {
  const selection: OptionSelection = {};

  for (const group of groups) {
    if (!CHOICE_OPTION_TYPES.includes(group.type)) continue;

    const active = group.values.filter((v) => v.isActive);
    if (active.length === 0) continue;

    if (group.type === "CHECKBOX") {
      const defaults = active.filter((v) => v.isDefault).map((v) => v.id);
      if (defaults.length > 0) selection[group.key] = defaults;
      continue;
    }

    // للمجموعات الإلزامية نختار الافتراضي، أو أول قيمة، حتى لا يرى العميل
    // سعرًا ناقصًا. المجموعات الاختيارية تبقى فارغة عمدًا.
    const preferred = active.find((v) => v.isDefault);
    if (preferred) selection[group.key] = preferred.id;
    else if (group.isRequired) selection[group.key] = active[0].id;
  }

  return selection;
}

/** تحويل الخيارات المختارة إلى شكل مقروء — لبنود الطلب ورسائل واتساب. */
export function describeSelection(
  groups: PricingOptionGroup[],
  selection: OptionSelection,
): { key: string; label: string; value: string; valueLabel: string }[] {
  const described: { key: string; label: string; value: string; valueLabel: string }[] =
    [];

  for (const group of groups) {
    if (CHOICE_OPTION_TYPES.includes(group.type)) {
      const values = selectedValues(group, selection);
      if (values.length === 0) continue;
      described.push({
        key: group.key,
        label: group.name,
        value: values.map((v) => v.value).join("، "),
        valueLabel: values.map((v) => v.label).join("، "),
      });
      continue;
    }

    // الحقول الحرّة (نص، رقم، تاريخ) تُخزَّن كقيمتها مباشرة
    const raw = selection[group.key];
    if (typeof raw === "string" && raw.trim().length > 0) {
      described.push({
        key: group.key,
        label: group.name,
        value: raw.trim(),
        valueLabel: raw.trim(),
      });
    }
  }

  return described;
}
