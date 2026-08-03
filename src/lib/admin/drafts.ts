import type { OptionPriceMode, OptionType, PriceMode, ProjectImageStage } from "@/lib/constants";

/**
 * ============================================================================
 *  القيم الابتدائية لمحرّرات لوحة التحكم
 * ============================================================================
 *  ⚠️ لماذا هذه القيم في ملف مستقل ولا تعيش داخل المحرّرات؟
 *
 *  المحرّرات مكوّنات عميل ("use client")، وصفحات الإنشاء مكوّنات خادم. حين
 *  يستورد مكوّن خادم قيمة عادية من وحدة عميل، يستبدلها Next.js بمرجع عميل
 *  (client reference) لا بالقيمة نفسها — فيصبح الكائن فارغًا على الخادم،
 *  وتنهار الصفحة عند أول قراءة لمصفوفة بداخله أثناء التصيير.
 *
 *  وضعها في وحدة محايدة يجعل الطرفين يقرآن القيمة الحقيقية.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// المنتج
// ---------------------------------------------------------------------------

export type ImageDraft = { url: string; alt: string };

export type ValueDraft = {
  label: string;
  value: string;
  priceModifier: number;
  priceMode: OptionPriceMode;
  swatchHex: string;
  isDefault: boolean;
  isActive: boolean;
};

export type GroupDraft = {
  name: string;
  key: string;
  type: OptionType;
  helpText: string;
  isRequired: boolean;
  values: ValueDraft[];
};

export type TierDraft = {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  label: string;
};

export type ProductDraft = {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  priceMode: PriceMode;
  basePrice: number;
  compareAtPrice: number | null;
  unit: string;
  minQuantity: number;
  quantityStep: number;
  sku: string;
  leadTime: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  seoTitle: string;
  seoDescription: string;
  images: ImageDraft[];
  optionGroups: GroupDraft[];
  quantityTiers: TierDraft[];
  serviceIds: string[];
};

export const EMPTY_PRODUCT: ProductDraft = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  priceMode: "FIXED",
  basePrice: 0,
  compareAtPrice: null,
  unit: "قطعة",
  minQuantity: 1,
  quantityStep: 1,
  sku: "",
  leadTime: "",
  isActive: true,
  isFeatured: false,
  order: 0,
  seoTitle: "",
  seoDescription: "",
  images: [],
  optionGroups: [],
  quantityTiers: [],
  serviceIds: [],
};

export const EMPTY_OPTION_VALUE: ValueDraft = {
  label: "",
  value: "",
  priceModifier: 0,
  priceMode: "ADD_PER_UNIT",
  swatchHex: "",
  isDefault: false,
  isActive: true,
};

// ---------------------------------------------------------------------------
// معرض الأعمال
// ---------------------------------------------------------------------------

export type GalleryImageDraft = {
  url: string;
  alt: string;
  caption?: string;
  stage?: ProjectImageStage;
};

export type ProjectDraft = {
  id?: string;
  title: string;
  slug: string;
  categoryId: string;
  clientName: string;
  summary: string;
  description: string;
  materials: string;
  dimensions: string;
  techniques: string;
  completedAt: string;
  relatedProductId: string;
  isFeatured: boolean;
  isActive: boolean;
  order: number;
  seoTitle: string;
  seoDescription: string;
  images: GalleryImageDraft[];
};

export const EMPTY_PROJECT: ProjectDraft = {
  title: "",
  slug: "",
  categoryId: "",
  clientName: "",
  summary: "",
  description: "",
  materials: "",
  dimensions: "",
  techniques: "",
  completedAt: "",
  relatedProductId: "",
  isFeatured: false,
  isActive: true,
  order: 0,
  seoTitle: "",
  seoDescription: "",
  images: [],
};

// ---------------------------------------------------------------------------
// الخدمات
// ---------------------------------------------------------------------------

export type ServiceDraft = {
  id?: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  iconKey: string;
  imageUrl: string;
  imageAlt: string;
  highlights: string[];
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  seoTitle: string;
  seoDescription: string;
  productIds: string[];
  images: GalleryImageDraft[];
};

export const EMPTY_SERVICE: ServiceDraft = {
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  iconKey: "package",
  imageUrl: "",
  imageAlt: "",
  highlights: [],
  isActive: true,
  isFeatured: true,
  order: 0,
  seoTitle: "",
  seoDescription: "",
  productIds: [],
  images: [],
};
