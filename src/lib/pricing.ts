import {
  CHOICE_OPTION_TYPES,
  type OptionPriceMode,
  type OptionType,
  type PriceMode,
} from "@/lib/constants";
import { fromMinor, multiplyMinor, toMinor } from "@/lib/data/money";

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
 *    ٤. MULTIPLY        — تُضرب في سعر الوحدة بعد الإضافات (بالتتابع، وكل
 *                         خطوة تُقرَّب لأقرب هللة).
 *    ٥. الإجمالي = سعر الوحدة × الكمية + مجموع معدّلات ADD (رسوم ثابتة للطلب).
 *
 *  الحساب كله بأعداد صحيحة بالهللات (src/lib/data/money.ts): لا فاصلة عائمة
 *  في الجمع ولا الضرب، فالنتيجة نفسها في المتصفّح وعلى الخادم وفي الاختبارات.
 *
 *  قواعد الحالات الحدّية (مُغطّاة باختبارات tests/data/pricing.test.ts):
 *    • شريحة الكمية = الشريحة ذات أكبر minQty ≤ الكمية. إن تجاوزت الكمية
 *      maxQty لآخر شريحة بلا شريحة أعلى (أو وقعت في فجوة بين شريحتين) تبقى
 *      آخر شريحة منطبقة — فلا يرتفع سعر الوحدة أبدًا بزيادة الكمية.
 *      الكمية الأقل من أول شريحة تُسعَّر بـ basePrice.
 *    • الكمية تُقرَّب لأعلى لأقرب مضاعف صالح (min + k × step)، وتُحصر بين
 *      الحد الأدنى و MAX_ORDER_QUANTITY.
 *    • سعر الوحدة لا يقل عن صفر، والرسوم الثابتة كذلك.
 *    • الخيارات الإلزامية تشمل الحقول الحرّة (نص/رقم/تاريخ)، عدا FILE لأن
 *      العميل قد يرسل التصميم بعد الطلب.
 * ============================================================================
 */

/** أقصى كمية للبند الواحد — تطابق حدّ مخطط التحقق في src/lib/validation.ts. */
export const MAX_ORDER_QUANTITY = 1_000_000;

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

/**
 * إيجاد شريحة الكمية المطابقة: أكبر minQty لا يتجاوز الكمية.
 * maxQty معلومة للعرض فقط — لا تُسقط الكمية الأكبر منها إلى السعر الأساسي.
 */
export function findTier(
  tiers: PricingQuantityTier[],
  quantity: number,
): PricingQuantityTier | null {
  let match: PricingQuantityTier | null = null;
  for (const tier of tiers) {
    if (quantity >= tier.minQty && (match === null || tier.minQty > match.minQty)) {
      match = tier;
    }
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

/** قيمة مكتوبة في حقل حرّ (نص/رقم/تاريخ)؟ */
function hasFreeValue(group: PricingOptionGroup, selection: OptionSelection): boolean {
  const raw = selection[group.key];
  return typeof raw === "string" && raw.trim().length > 0;
}

/** مفاتيح المجموعات الإلزامية الناقصة (اختيارية الاختيار أو الحقول الحرّة). */
function findMissingRequired(
  groups: PricingOptionGroup[],
  selection: OptionSelection,
): string[] {
  return groups
    .filter((group) => group.isRequired)
    .filter((group) => {
      if (CHOICE_OPTION_TYPES.includes(group.type)) {
        // مجموعة بلا قيم فعّالة لا يمكن اختيار شيء منها — لا تُحسب ناقصة
        const hasActive = group.values.some((value) => value.isActive);
        return hasActive && selectedValues(group, selection).length === 0;
      }
      // الملفات تُرفع غالبًا بعد الطلب، فلا تمنع الشراء
      if (group.type === "FILE") return false;
      return !hasFreeValue(group, selection);
    })
    .map((group) => group.key);
}

/** حساب سعر البند بالكامل. */
export function calculatePrice(
  product: PricingProduct,
  selection: OptionSelection,
  requestedQuantity: number,
): PriceBreakdown {
  const quantity = normalizeQuantity(product, requestedQuantity);
  const missingRequired = findMissingRequired(product.optionGroups, selection);

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
  // كل المبالغ هنا بالهللات (أعداد صحيحة)
  let unitMinor = toMinor(tier ? tier.unitPrice : product.basePrice);

  const lines: PriceLine[] = [
    {
      label: tier?.label ?? "سعر الوحدة",
      amount: fromMinor(unitMinor),
      kind: "base",
    },
  ];

  const picked = product.optionGroups.flatMap((group) =>
    selectedValues(group, selection).map((value) => ({
      value,
      label: `${group.name}: ${value.label}`,
    })),
  );

  // ١. الاستبدال الكامل لسعر الوحدة (آخر قيمة مختارة تغلب)
  for (const { value, label } of picked) {
    if (value.priceMode === "OVERRIDE_UNIT") {
      unitMinor = toMinor(value.priceModifier);
      lines.length = 0;
      lines.push({ label, amount: fromMinor(unitMinor), kind: "base" });
    }
  }

  // ٢. الإضافات على سعر الوحدة
  for (const { value, label } of picked) {
    if (value.priceMode === "ADD_PER_UNIT" && value.priceModifier !== 0) {
      const delta = toMinor(value.priceModifier);
      unitMinor += delta;
      lines.push({ label, amount: fromMinor(delta), kind: "per-unit" });
    }
  }

  // ٣. المضاعِفات (بعد الإضافات، بالتتابع)
  for (const { value, label } of picked) {
    if (value.priceMode === "MULTIPLY" && value.priceModifier > 0) {
      const next = multiplyMinor(unitMinor, value.priceModifier);
      lines.push({ label, amount: fromMinor(next - unitMinor), kind: "multiplier" });
      unitMinor = next;
    }
  }

  // ٤. الرسوم الثابتة للطلب
  let flatMinor = 0;
  for (const { value, label } of picked) {
    if (value.priceMode === "ADD" && value.priceModifier !== 0) {
      const delta = toMinor(value.priceModifier);
      flatMinor += delta;
      lines.push({ label, amount: fromMinor(delta), kind: "flat" });
    }
  }

  unitMinor = Math.max(0, unitMinor);
  flatMinor = Math.max(0, flatMinor);

  return {
    priceable: true,
    unitPrice: fromMinor(unitMinor),
    quantity,
    total: fromMinor(unitMinor * quantity + flatMinor),
    flatFees: fromMinor(flatMinor),
    tierLabel: tier?.label ?? null,
    lines,
    missingRequired,
  };
}

/**
 * أقل سعر وحدة ممكن للمنتج — يُعرض كـ "يبدأ من".
 *
 * يُحسب عند الحد الأدنى للكمية بأرخص تركيبة من الخيارات الإلزامية. الأرخص
 * يُحدَّد بالحساب الفعلي لا بتقدير: المضاعِف يؤثر على الإضافات قبله، فاختيار
 * "أرخص قيمة" في كل مجموعة منفردة قد لا يعطي أرخص تركيبة. نبدأ بتقدير أوّلي
 * ثم نحسّن مجموعة بعد مجموعة بالحساب الحقيقي حتى يستقر الحل.
 */
export function calculateStartingPrice(product: PricingProduct): number | null {
  if (product.priceMode === "QUOTE_ONLY") return null;

  const groups = product.optionGroups.filter(
    // الخيارات غير الإلزامية تُترك فارغة لأنها لا تُحتسب في "يبدأ من"
    (group) =>
      group.isRequired &&
      CHOICE_OPTION_TYPES.includes(group.type) &&
      group.values.some((value) => value.isActive),
  );

  const selection: OptionSelection = {};
  for (const group of groups) {
    const active = group.values.filter((value) => value.isActive);
    selection[group.key] = active.reduce((min, value) =>
      effectiveCost(value) < effectiveCost(min) ? value : min,
    ).id;
  }

  const priceOf = (candidate: OptionSelection) =>
    calculatePrice(product, candidate, product.minQuantity).unitPrice;

  // تحسين تدريجي — عدد المجموعات صغير (≤ ١٥) فالكلفة مهملة
  for (let pass = 0; pass < 4; pass += 1) {
    let improved = false;

    for (const group of groups) {
      let bestId = selection[group.key] as string;
      let bestPrice = priceOf(selection);

      for (const value of group.values.filter((entry) => entry.isActive)) {
        const price = priceOf({ ...selection, [group.key]: value.id });
        if (price < bestPrice) {
          bestPrice = price;
          bestId = value.id;
        }
      }

      if (bestId !== selection[group.key]) {
        selection[group.key] = bestId;
        improved = true;
      }
    }

    if (!improved) break;
  }

  const result = calculatePrice(product, selection, product.minQuantity);
  return result.priceable ? result.unitPrice : null;
}

/** تكلفة تقريبية لقيمة خيار — نقطة بداية فقط لتحسين "يبدأ من". */
function effectiveCost(value: PricingOptionValue): number {
  switch (value.priceMode) {
    case "OVERRIDE_UNIT":
      return value.priceModifier;
    case "MULTIPLY":
      // 1.0 يعني بلا تغيير؛ نحوّلها لمقياس قابل للمقارنة مع الإضافات
      return (value.priceModifier - 1) * 100;
    case "ADD":
      // رسم ثابت لا يدخل في سعر الوحدة
      return 0;
    default:
      return value.priceModifier;
  }
}

/**
 * تثبيت الكمية: ضمن [الحد الأدنى، MAX_ORDER_QUANTITY] وعلى مضاعفات الخطوة
 * ابتداءً من الحد الأدنى (min + k × step). ما بين خطوتين يُقرَّب لأعلى فلا
 * يحصل العميل على أقل مما طلب، والقيم غير الصالحة تعود للحد الأدنى.
 */
export function normalizeQuantity(
  product: Pick<PricingProduct, "minQuantity" | "quantityStep">,
  quantity: number,
): number {
  const min = Math.max(1, Math.floor(product.minQuantity) || 1);
  const step = Math.max(1, Math.floor(product.quantityStep) || 1);

  if (!Number.isFinite(quantity) || quantity <= min) return min;

  const clamped = Math.min(Math.floor(quantity), MAX_ORDER_QUANTITY);
  const steps = Math.ceil((clamped - min) / step);
  const snapped = min + steps * step;

  // لا نتجاوز السقف: نهبط لآخر مضاعف صالح تحته
  if (snapped > MAX_ORDER_QUANTITY) {
    return min + Math.floor((MAX_ORDER_QUANTITY - min) / step) * step;
  }
  return snapped;
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

// ---------------------------------------------------------------------------
//  تحويل سجلات القاعدة إلى مدخلات المحرّك
// ---------------------------------------------------------------------------

/** شكل المنتج كما يعود من Prisma (أنواع نصية بدل الاتحادات المغلقة). */
export type RawPricingProduct = {
  priceMode: string;
  basePrice: number;
  minQuantity: number;
  quantityStep: number;
  quantityTiers: { minQty: number; maxQty: number | null; unitPrice: number; label: string | null }[];
  optionGroups: {
    id: string;
    key: string;
    name: string;
    type: string;
    isRequired: boolean;
    values: {
      id: string;
      label: string;
      value: string;
      priceModifier: number;
      priceMode: string;
      isDefault: boolean;
      isActive: boolean;
    }[];
  }[];
};

/**
 * نقطة التحويل الوحيدة من سجل القاعدة إلى PricingProduct.
 * تستعملها بطاقات المنتجات والسلة والطلبات حتى لا يكرّر كل مستهلك الخريطة.
 */
export function toPricingProduct(product: RawPricingProduct): PricingProduct {
  return {
    priceMode: product.priceMode as PriceMode,
    basePrice: product.basePrice,
    minQuantity: product.minQuantity,
    quantityStep: product.quantityStep,
    quantityTiers: product.quantityTiers.map((tier) => ({
      minQty: tier.minQty,
      maxQty: tier.maxQty,
      unitPrice: tier.unitPrice,
      label: tier.label,
    })),
    optionGroups: product.optionGroups.map((group) => ({
      id: group.id,
      key: group.key,
      name: group.name,
      type: group.type as OptionType,
      isRequired: group.isRequired,
      values: group.values.map((value) => ({
        id: value.id,
        label: value.label,
        value: value.value,
        priceModifier: value.priceModifier,
        priceMode: value.priceMode as OptionPriceMode,
        isDefault: value.isDefault,
        isActive: value.isActive,
      })),
    })),
  };
}
