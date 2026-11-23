import type {
  OptionPriceMode,
  OptionType,
  PriceMode,
} from "@/lib/constants";
import type {
  PricingOptionGroup,
  PricingOptionValue,
  PricingProduct,
  PricingQuantityTier,
} from "@/lib/pricing";

/** قيمة خيار بمعدّل سعر — المعرّف هو `${key}-${value}` ليسهل قراءة الاختبارات. */
export function val(
  id: string,
  priceModifier: number,
  priceMode: OptionPriceMode,
  extra: Partial<PricingOptionValue> = {},
): PricingOptionValue {
  return {
    id,
    label: `قيمة ${id}`,
    value: id,
    priceModifier,
    priceMode,
    isDefault: false,
    isActive: true,
    ...extra,
  };
}

export function group(
  key: string,
  values: PricingOptionValue[],
  extra: Partial<PricingOptionGroup> = {},
): PricingOptionGroup {
  return {
    id: `g-${key}`,
    key,
    name: `مجموعة ${key}`,
    type: "RADIO" as OptionType,
    isRequired: false,
    values,
    ...extra,
  };
}

export function tier(
  minQty: number,
  maxQty: number | null,
  unitPrice: number,
  label: string | null = null,
): PricingQuantityTier {
  return { minQty, maxQty, unitPrice, label };
}

export function product(extra: Partial<PricingProduct> = {}): PricingProduct {
  return {
    priceMode: "FIXED" as PriceMode,
    basePrice: 10,
    minQuantity: 1,
    quantityStep: 1,
    optionGroups: [],
    quantityTiers: [],
    ...extra,
  };
}
