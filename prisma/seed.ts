/**
 * ============================================================================
 *  البيانات الأولية
 * ============================================================================
 *  تُنشئ هيكل محتوى كاملاً وواقعيًا: التصنيفات، المنتجات مع خياراتها وشرائح
 *  أسعارها، الخدمات، تصنيفات معرض الأعمال، المعدات، الأسئلة الشائعة،
 *  الصفحات، مناطق الشحن، وحساب المدير.
 *
 *  ⚠️  الأسعار وبيانات التواصل هنا قيم هيكلية معلّمة بـ [[يحتاج استبدال]]
 *      ريثما تصل قائمة الأسعار الحقيقية وملف الهوية. الهيكل صحيح ونهائي،
 *      والقيم وحدها هي ما يتغيّر — من لوحة التحكم ودون لمس الكود.
 *
 *  التشغيل:  npm run db:seed
 * ============================================================================
 */

import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

const NEEDS = "[[يحتاج استبدال]]";

async function main() {
  console.log("▶ بدء تهيئة البيانات الأولية…");

  await seedSettings();
  const categories = await seedCategories();
  await seedProducts(categories);
  await seedServices();
  await seedProjectCategories();
  await seedEquipment();
  await seedFaqs();
  await seedTestimonials();
  await seedPages();
  await seedShipping();
  await seedAdmin();

  console.log("✔ اكتملت التهيئة.");
}

// ---------------------------------------------------------------------------
// إعدادات الموقع
// ---------------------------------------------------------------------------

async function seedSettings() {
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      companyName: "الورقة الذهبية للطباعة والتجهيزات الدعائية",
      tagline: "نحوّل أفكارك إلى مطبوعات ومنتجات دعائية بين يديك",
      description:
        "مصنع متكامل للطباعة والتجهيزات الدعائية يقدّم حلول الطباعة كاملة تحت سقف واحد: البوكسات والتغليف، الأكواب، المطبوعات الورقية، الاستيكرات، طباعة UV، الأكريليك، اللوحات الإعلانية والمضيئة، الفلكس والبنرات، الطباعة على الملابس، والهدايا الدعائية.",
      phone: `+966500000000 ${NEEDS}`,
      whatsapp: `966500000000 ${NEEDS}`,
      email: `info@example.com ${NEEDS}`,
      addressLine: NEEDS,
      city: "الرياض",
      workingHours: "السبت – الخميس: ٩ صباحًا – ٩ مساءً",
      social: {},
      vatNumber: "",
      crNumber: "",
      vatRate: 0.15,
      pricesIncludeVat: true,
      paymentSettings: {
        bankTransfer: true,
        online: false,
        cod: false,
        onPickup: true,
        bankAccounts: [],
      },
    },
  });
  console.log("  • إعدادات الموقع");
}

// ---------------------------------------------------------------------------
// تصنيفات المنتجات
// ---------------------------------------------------------------------------

const CATEGORIES = [
  {
    slug: "boxes-packaging",
    name: "بوكسات وتغليف",
    iconKey: "box",
    description:
      "بوكسات كرتون وعلب تغليف مطبوعة بمقاسات وخامات حسب الطلب، مناسبة للمطاعم والمتاجر والهدايا.",
  },
  {
    slug: "cups",
    name: "أكواب ورقية وبلاستيكية",
    iconKey: "cup",
    description:
      "أكواب مشروبات ساخنة وباردة مطبوعة بشعارك، بخامات آمنة غذائيًا ومقاسات متعددة.",
  },
  {
    slug: "paper-prints",
    name: "مطبوعات ورقية",
    iconKey: "document",
    description:
      "كروت شخصية، بروشورات، فواتير، دفاتر، ومطبوعات إدارية بجودة طباعة عالية.",
  },
  {
    slug: "stickers",
    name: "استيكرات وملصقات",
    iconKey: "sticker",
    description:
      "استيكرات لاصقة وشفافة ومقاومة للماء بقص حسب الشكل، للمنتجات والعبوات والتغليف.",
  },
  {
    slug: "acrylic",
    name: "أكريليك",
    iconKey: "layers",
    description: "قص وحفر وطباعة الأكريليك بدقة عالية للوحات والستاندات والديكورات.",
  },
  {
    slug: "signage",
    name: "لوحات إعلانية ومضيئة",
    iconKey: "sign",
    description: "لوحات محلات، حروف بارزة، ولوحات مضيئة بتقنية LED بتنفيذ وتركيب كامل.",
  },
  {
    slug: "flex-banners",
    name: "فلكس وبنرات",
    iconKey: "banner",
    description: "طباعة فلكس وبنرات ورول أب بمقاسات كبيرة وألوان ثابتة تتحمل الخارج.",
  },
  {
    slug: "apparel",
    name: "طباعة على الملابس",
    iconKey: "shirt",
    description: "طباعة وتطريز على التيشيرتات والكابات والزي الموحّد بكميات صغيرة وكبيرة.",
  },
  {
    slug: "promotional-gifts",
    name: "هدايا دعائية",
    iconKey: "gift",
    description: "أقلام، أكواب حرارية، أجندات، وحقائب مطبوعة بشعار منشأتك.",
  },
];

async function seedCategories() {
  const map = new Map<string, string>();

  for (const [index, category] of CATEGORIES.entries()) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        iconKey: category.iconKey,
        order: index,
        seoTitle: `${category.name} | طباعة وتجهيز حسب الطلب`,
        seoDescription: category.description,
      },
    });
    map.set(category.slug, record.id);
  }

  console.log(`  • ${CATEGORIES.length} تصنيف منتجات`);
  return map;
}

// ---------------------------------------------------------------------------
// المنتجات
// ---------------------------------------------------------------------------

type SeedOptionValue = {
  label: string;
  value: string;
  priceModifier?: number;
  priceMode?: "ADD" | "ADD_PER_UNIT" | "MULTIPLY" | "OVERRIDE_UNIT";
  isDefault?: boolean;
  swatchHex?: string;
};

type SeedOptionGroup = {
  name: string;
  key: string;
  type?: "SELECT" | "RADIO" | "COLOR" | "NUMBER" | "TEXT" | "TEXTAREA" | "CHECKBOX" | "FILE" | "DATE";
  isRequired?: boolean;
  helpText?: string;
  values?: SeedOptionValue[];
};

type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  priceMode: "FIXED" | "STARTS_FROM" | "QUOTE_ONLY";
  basePrice?: number;
  unit?: string;
  minQuantity?: number;
  quantityStep?: number;
  leadTime?: string;
  isFeatured?: boolean;
  tiers?: { minQty: number; maxQty: number | null; unitPrice: number; label?: string }[];
  groups?: SeedOptionGroup[];
};

/** مجموعات خيارات متكررة تُعاد استخدامها بين المنتجات. */
const printSidesGroup: SeedOptionGroup = {
  name: "وجه الطباعة",
  key: "sides",
  type: "RADIO",
  values: [
    { label: "وجه واحد", value: "وجه واحد", isDefault: true },
    { label: "وجهان", value: "وجهان", priceModifier: 1.35, priceMode: "MULTIPLY" },
  ],
};

const designUploadGroup: SeedOptionGroup = {
  name: "رفع التصميم أو الشعار",
  key: "design",
  type: "FILE",
  isRequired: false,
  helpText:
    "ارفع ملف التصميم بصيغة PDF أو AI أو PSD أو صورة عالية الدقة. يمكنك أيضًا إرساله لاحقًا عبر واتساب.",
};

const notesGroup: SeedOptionGroup = {
  name: "ملاحظات خاصة",
  key: "notes",
  type: "TEXTAREA",
  isRequired: false,
  helpText: "أي تفاصيل إضافية تودّ أن يراعيها قسم الإنتاج.",
};

const dueDateGroup: SeedOptionGroup = {
  name: "موعد التسليم المطلوب",
  key: "dueDate",
  type: "DATE",
  isRequired: false,
  helpText: "اتركه فارغًا إن لم يكن لديك موعد محدد.",
};

const PRODUCTS: SeedProduct[] = [
  {
    slug: "printed-carton-box",
    name: "بوكس كرتون مطبوع حسب الطلب",
    category: "boxes-packaging",
    shortDescription: "بوكس كرتون مطبوع بألوان كاملة، بمقاسات وخامات تُحدَّد حسب منتجك.",
    description:
      "بوكس كرتون يُصنَّع ويُطبع حسب مقاسك ومنتجك، مناسب للمطاعم والمتاجر الإلكترونية وعلب الهدايا. نوفّر خامات متعددة السماكة مع تشطيبات لامعة ومطفية، ويمكن إضافة نافذة شفافة أو مقبض. تشمل الخدمة مراجعة التصميم فنيًا قبل الطباعة والتأكد من دقة القص والثنيات.",
    priceMode: "STARTS_FROM",
    basePrice: 4.5,
    unit: "قطعة",
    minQuantity: 100,
    quantityStep: 50,
    leadTime: "٥ – ٨ أيام عمل",
    isFeatured: true,
    tiers: [
      { minQty: 100, maxQty: 249, unitPrice: 4.5, label: "١٠٠ – ٢٤٩ قطعة" },
      { minQty: 250, maxQty: 499, unitPrice: 3.8, label: "٢٥٠ – ٤٩٩ قطعة" },
      { minQty: 500, maxQty: 999, unitPrice: 3.1, label: "٥٠٠ – ٩٩٩ قطعة" },
      { minQty: 1000, maxQty: null, unitPrice: 2.4, label: "١٠٠٠ قطعة فأكثر" },
    ],
    groups: [
      {
        name: "المقاس",
        key: "size",
        values: [
          { label: "صغير — ١٥×١٥×٥ سم", value: "١٥×١٥×٥ سم", isDefault: true },
          { label: "متوسط — ٢٠×٢٠×٨ سم", value: "٢٠×٢٠×٨ سم", priceModifier: 0.9, priceMode: "ADD_PER_UNIT" },
          { label: "كبير — ٣٠×٢٥×١٠ سم", value: "٣٠×٢٥×١٠ سم", priceModifier: 1.8, priceMode: "ADD_PER_UNIT" },
          { label: "مقاس خاص", value: "مقاس خاص", priceModifier: 1.2, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "الخامة",
        key: "material",
        values: [
          { label: "كرتون مقوّى ٣٥٠ جرام", value: "كرتون ٣٥٠ جرام", isDefault: true },
          { label: "كرتون مضلّع (E-Flute)", value: "كرتون مضلّع", priceModifier: 0.7, priceMode: "ADD_PER_UNIT" },
          { label: "كرافت طبيعي", value: "كرافت طبيعي", priceModifier: 0.5, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "التشطيب",
        key: "finish",
        isRequired: false,
        values: [
          { label: "بدون تشطيب", value: "بدون", isDefault: true },
          { label: "سلوفان لامع", value: "سلوفان لامع", priceModifier: 0.4, priceMode: "ADD_PER_UNIT" },
          { label: "سلوفان مطفي", value: "سلوفان مطفي", priceModifier: 0.45, priceMode: "ADD_PER_UNIT" },
          { label: "تذهيب UV موضعي", value: "UV موضعي", priceModifier: 0.85, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "إضافات",
        key: "addons",
        type: "CHECKBOX",
        isRequired: false,
        values: [
          { label: "نافذة شفافة", value: "نافذة شفافة", priceModifier: 0.6, priceMode: "ADD_PER_UNIT" },
          { label: "مقبض حمل", value: "مقبض حمل", priceModifier: 0.5, priceMode: "ADD_PER_UNIT" },
          { label: "قالب قص خاص", value: "قالب قص خاص", priceModifier: 350, priceMode: "ADD" },
        ],
      },
      designUploadGroup,
      dueDateGroup,
      notesGroup,
    ],
  },
  {
    slug: "luxury-gift-box",
    name: "علبة هدايا فاخرة",
    category: "boxes-packaging",
    shortDescription: "علبة صلبة بغطاء منفصل وتبطين داخلي — تُسعَّر حسب التصميم والمقاس.",
    description:
      "علبة هدايا صلبة تُنفَّذ بخامات فاخرة مع تبطين إسفنجي أو مخملي، وتشطيبات تشمل الطباعة بالذهب أو الفضة والتنقيط البارز. لأن هذا المنتج يعتمد كليًا على التصميم والمقاس ونوع التبطين، نراجع مواصفاتك ونرسل عرض سعر دقيقًا خلال يوم عمل.",
    priceMode: "QUOTE_ONLY",
    unit: "قطعة",
    minQuantity: 50,
    leadTime: "١٠ – ١٤ يوم عمل",
    isFeatured: true,
    groups: [
      {
        name: "نوع التبطين",
        key: "lining",
        isRequired: false,
        values: [
          { label: "بدون تبطين", value: "بدون تبطين", isDefault: true },
          { label: "إسفنج مقصوص", value: "إسفنج مقصوص" },
          { label: "مخمل", value: "مخمل" },
        ],
      },
      { name: "المقاس المطلوب", key: "size", type: "TEXT", helpText: "الطول × العرض × الارتفاع بالسنتيمتر." },
      designUploadGroup,
      notesGroup,
    ],
  },
  {
    slug: "paper-cup-8oz",
    name: "كوب ورقي مطبوع ٨ أونصة",
    category: "cups",
    shortDescription: "كوب ورقي للمشروبات الساخنة بطباعة كاملة حول الكوب.",
    description:
      "كوب ورقي مزدوج الطبقة للمشروبات الساخنة، بخامة آمنة غذائيًا ومعتمدة، وطباعة كاملة ٣٦٠ درجة بألوان ثابتة لا تتأثر بالحرارة. مناسب للمقاهي والمطاعم والفعاليات. يشمل السعر مراجعة التصميم وضبط الألوان.",
    priceMode: "STARTS_FROM",
    basePrice: 0.65,
    unit: "كوب",
    minQuantity: 1000,
    quantityStep: 500,
    leadTime: "٧ – ١٠ أيام عمل",
    isFeatured: true,
    tiers: [
      { minQty: 1000, maxQty: 2499, unitPrice: 0.65, label: "١٠٠٠ – ٢٤٩٩ كوب" },
      { minQty: 2500, maxQty: 4999, unitPrice: 0.52, label: "٢٥٠٠ – ٤٩٩٩ كوب" },
      { minQty: 5000, maxQty: 9999, unitPrice: 0.43, label: "٥٠٠٠ – ٩٩٩٩ كوب" },
      { minQty: 10000, maxQty: null, unitPrice: 0.35, label: "١٠٠٠٠ كوب فأكثر" },
    ],
    groups: [
      {
        name: "الحجم",
        key: "size",
        values: [
          { label: "٤ أونصة", value: "٤ أونصة", priceModifier: -0.12, priceMode: "ADD_PER_UNIT" },
          { label: "٨ أونصة", value: "٨ أونصة", isDefault: true },
          { label: "١٢ أونصة", value: "١٢ أونصة", priceModifier: 0.15, priceMode: "ADD_PER_UNIT" },
          { label: "١٦ أونصة", value: "١٦ أونصة", priceModifier: 0.25, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "عدد ألوان الطباعة",
        key: "colors",
        values: [
          { label: "لون واحد", value: "لون واحد" },
          { label: "لونان", value: "لونان", priceModifier: 0.06, priceMode: "ADD_PER_UNIT" },
          { label: "ألوان كاملة (CMYK)", value: "ألوان كاملة", isDefault: true, priceModifier: 0.12, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "إضافات",
        key: "addons",
        type: "CHECKBOX",
        isRequired: false,
        values: [
          { label: "أغطية بلاستيكية", value: "أغطية", priceModifier: 0.18, priceMode: "ADD_PER_UNIT" },
          { label: "حاملات كرتون", value: "حاملات كرتون", priceModifier: 0.22, priceMode: "ADD_PER_UNIT" },
        ],
      },
      designUploadGroup,
      dueDateGroup,
      notesGroup,
    ],
  },
  {
    slug: "plastic-cup-printed",
    name: "كوب بلاستيك مطبوع",
    category: "cups",
    shortDescription: "كوب بلاستيك شفاف للمشروبات الباردة بطباعة حول الكوب.",
    description:
      "كوب بلاستيك شفاف عالي الجودة للمشروبات الباردة والعصائر، بطباعة ثابتة مقاومة للتكثّف والرطوبة. متوفر بأحجام متعددة وبإمكانية إضافة أغطية قبة أو مسطحة.",
    priceMode: "STARTS_FROM",
    basePrice: 0.85,
    unit: "كوب",
    minQuantity: 1000,
    quantityStep: 500,
    leadTime: "٧ – ١٠ أيام عمل",
    tiers: [
      { minQty: 1000, maxQty: 2499, unitPrice: 0.85, label: "١٠٠٠ – ٢٤٩٩ كوب" },
      { minQty: 2500, maxQty: 4999, unitPrice: 0.7, label: "٢٥٠٠ – ٤٩٩٩ كوب" },
      { minQty: 5000, maxQty: null, unitPrice: 0.58, label: "٥٠٠٠ كوب فأكثر" },
    ],
    groups: [
      {
        name: "الحجم",
        key: "size",
        values: [
          { label: "١٢ أونصة", value: "١٢ أونصة", isDefault: true },
          { label: "١٦ أونصة", value: "١٦ أونصة", priceModifier: 0.12, priceMode: "ADD_PER_UNIT" },
          { label: "٢٢ أونصة", value: "٢٢ أونصة", priceModifier: 0.24, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "الأغطية",
        key: "lids",
        isRequired: false,
        values: [
          { label: "بدون أغطية", value: "بدون", isDefault: true },
          { label: "غطاء مسطح", value: "غطاء مسطح", priceModifier: 0.16, priceMode: "ADD_PER_UNIT" },
          { label: "غطاء قبة", value: "غطاء قبة", priceModifier: 0.2, priceMode: "ADD_PER_UNIT" },
        ],
      },
      designUploadGroup,
      notesGroup,
    ],
  },
  {
    slug: "business-cards",
    name: "كروت شخصية",
    category: "paper-prints",
    shortDescription: "كروت شخصية بخامات فاخرة وتشطيبات متعددة — تسليم سريع.",
    description:
      "كروت شخصية بمقاس ٩×٥ سم بطباعة عالية الدقة على ورق فاخر. متوفرة بتشطيبات لامعة ومطفية ومخملية، مع خيارات التذهيب والتنقيط البارز. من أسرع منتجاتنا تنفيذًا.",
    priceMode: "STARTS_FROM",
    basePrice: 0.45,
    unit: "كرت",
    minQuantity: 100,
    quantityStep: 100,
    leadTime: "٢ – ٣ أيام عمل",
    isFeatured: true,
    tiers: [
      { minQty: 100, maxQty: 499, unitPrice: 0.45, label: "١٠٠ – ٤٩٩ كرت" },
      { minQty: 500, maxQty: 999, unitPrice: 0.3, label: "٥٠٠ – ٩٩٩ كرت" },
      { minQty: 1000, maxQty: null, unitPrice: 0.2, label: "١٠٠٠ كرت فأكثر" },
    ],
    groups: [
      {
        name: "الخامة",
        key: "material",
        values: [
          { label: "كوشيه ٣٠٠ جرام", value: "كوشيه ٣٠٠ جرام", isDefault: true },
          { label: "كوشيه ٣٥٠ جرام", value: "كوشيه ٣٥٠ جرام", priceModifier: 0.06, priceMode: "ADD_PER_UNIT" },
          { label: "ورق مخملي", value: "ورق مخملي", priceModifier: 0.18, priceMode: "ADD_PER_UNIT" },
          { label: "كرافت طبيعي", value: "كرافت", priceModifier: 0.1, priceMode: "ADD_PER_UNIT" },
        ],
      },
      printSidesGroup,
      {
        name: "التشطيب",
        key: "finish",
        isRequired: false,
        values: [
          { label: "بدون", value: "بدون", isDefault: true },
          { label: "سلوفان لامع", value: "سلوفان لامع", priceModifier: 0.05, priceMode: "ADD_PER_UNIT" },
          { label: "سلوفان مطفي", value: "سلوفان مطفي", priceModifier: 0.06, priceMode: "ADD_PER_UNIT" },
          { label: "تذهيب حواف", value: "تذهيب حواف", priceModifier: 0.22, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "الزوايا",
        key: "corners",
        isRequired: false,
        values: [
          { label: "زوايا قائمة", value: "زوايا قائمة", isDefault: true },
          { label: "زوايا دائرية", value: "زوايا دائرية", priceModifier: 60, priceMode: "ADD" },
        ],
      },
      designUploadGroup,
      dueDateGroup,
      notesGroup,
    ],
  },
  {
    slug: "brochure-a4",
    name: "بروشور A4 مطوي",
    category: "paper-prints",
    shortDescription: "بروشور تعريفي بطيّة ثنائية أو ثلاثية بطباعة وجهين.",
    description:
      "بروشور تعريفي بمقاس A4 قبل الطي، يُطبع بألوان كاملة على وجهين مع خيارات الطي الثنائي والثلاثي. مناسب لعروض الخدمات وقوائم المنتجات والمعارض.",
    priceMode: "STARTS_FROM",
    basePrice: 1.6,
    unit: "بروشور",
    minQuantity: 250,
    quantityStep: 250,
    leadTime: "٣ – ٥ أيام عمل",
    tiers: [
      { minQty: 250, maxQty: 999, unitPrice: 1.6, label: "٢٥٠ – ٩٩٩ نسخة" },
      { minQty: 1000, maxQty: 2999, unitPrice: 1.15, label: "١٠٠٠ – ٢٩٩٩ نسخة" },
      { minQty: 3000, maxQty: null, unitPrice: 0.82, label: "٣٠٠٠ نسخة فأكثر" },
    ],
    groups: [
      {
        name: "نوع الطي",
        key: "fold",
        values: [
          { label: "طي ثنائي", value: "طي ثنائي", isDefault: true },
          { label: "طي ثلاثي", value: "طي ثلاثي", priceModifier: 0.12, priceMode: "ADD_PER_UNIT" },
          { label: "بدون طي", value: "بدون طي", priceModifier: -0.1, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "الخامة",
        key: "material",
        values: [
          { label: "كوشيه ١٥٠ جرام", value: "كوشيه ١٥٠ جرام", isDefault: true },
          { label: "كوشيه ٢٠٠ جرام", value: "كوشيه ٢٠٠ جرام", priceModifier: 0.2, priceMode: "ADD_PER_UNIT" },
        ],
      },
      designUploadGroup,
      notesGroup,
    ],
  },
  {
    slug: "invoice-books",
    name: "دفاتر فواتير كربونية",
    category: "paper-prints",
    shortDescription: "دفاتر فواتير بنسختين أو ثلاث، مرقّمة ومطبوعة ببيانات منشأتك.",
    description:
      "دفاتر فواتير كربونية مرقّمة تسلسليًا، تُطبع ببيانات منشأتك والرقم الضريبي، وتُجلَّد بغلاف مقوّى. متوفرة بنسختين أو ثلاث نسخ بألوان ورق مختلفة لتسهيل الأرشفة.",
    priceMode: "STARTS_FROM",
    basePrice: 22,
    unit: "دفتر",
    minQuantity: 10,
    quantityStep: 5,
    leadTime: "٤ – ٦ أيام عمل",
    tiers: [
      { minQty: 10, maxQty: 24, unitPrice: 22, label: "١٠ – ٢٤ دفترًا" },
      { minQty: 25, maxQty: 49, unitPrice: 18, label: "٢٥ – ٤٩ دفترًا" },
      { minQty: 50, maxQty: null, unitPrice: 14, label: "٥٠ دفترًا فأكثر" },
    ],
    groups: [
      {
        name: "عدد النسخ",
        key: "copies",
        values: [
          { label: "نسختان", value: "نسختان", isDefault: true },
          { label: "ثلاث نسخ", value: "ثلاث نسخ", priceModifier: 5, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "عدد الأوراق في الدفتر",
        key: "sheets",
        values: [
          { label: "٥٠ ورقة", value: "٥٠ ورقة", isDefault: true },
          { label: "١٠٠ ورقة", value: "١٠٠ ورقة", priceModifier: 8, priceMode: "ADD_PER_UNIT" },
        ],
      },
      designUploadGroup,
      notesGroup,
    ],
  },
  {
    slug: "vinyl-stickers",
    name: "استيكر لاصق مقاوم للماء",
    category: "stickers",
    shortDescription: "استيكرات فينيل بقص حسب الشكل، مقاومة للماء والخدش.",
    description:
      "استيكرات فينيل عالية الجودة بطباعة ألوان كاملة وقص حسب الشكل المطلوب، مقاومة للماء والخدش وأشعة الشمس. مناسبة للعبوات والمنتجات والتغليف والسيارات.",
    priceMode: "STARTS_FROM",
    basePrice: 0.9,
    unit: "استيكر",
    minQuantity: 200,
    quantityStep: 100,
    leadTime: "٣ – ٥ أيام عمل",
    isFeatured: true,
    tiers: [
      { minQty: 200, maxQty: 999, unitPrice: 0.9, label: "٢٠٠ – ٩٩٩ استيكر" },
      { minQty: 1000, maxQty: 4999, unitPrice: 0.55, label: "١٠٠٠ – ٤٩٩٩ استيكر" },
      { minQty: 5000, maxQty: null, unitPrice: 0.32, label: "٥٠٠٠ استيكر فأكثر" },
    ],
    groups: [
      {
        name: "المقاس",
        key: "size",
        values: [
          { label: "٣×٣ سم", value: "٣×٣ سم" },
          { label: "٥×٥ سم", value: "٥×٥ سم", isDefault: true, priceModifier: 0.15, priceMode: "ADD_PER_UNIT" },
          { label: "٨×٨ سم", value: "٨×٨ سم", priceModifier: 0.4, priceMode: "ADD_PER_UNIT" },
          { label: "١٠×١٠ سم", value: "١٠×١٠ سم", priceModifier: 0.65, priceMode: "ADD_PER_UNIT" },
          { label: "مقاس خاص", value: "مقاس خاص", priceModifier: 0.5, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "الخامة",
        key: "material",
        values: [
          { label: "فينيل أبيض لامع", value: "فينيل أبيض لامع", isDefault: true },
          { label: "فينيل أبيض مطفي", value: "فينيل أبيض مطفي", priceModifier: 0.05, priceMode: "ADD_PER_UNIT" },
          { label: "شفاف", value: "شفاف", priceModifier: 0.12, priceMode: "ADD_PER_UNIT" },
          { label: "ذهبي / فضي", value: "ذهبي أو فضي", priceModifier: 0.25, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "شكل القص",
        key: "cut",
        values: [
          { label: "دائري", value: "دائري", isDefault: true },
          { label: "مربع", value: "مربع" },
          { label: "قص حسب الشكل", value: "قص حسب الشكل", priceModifier: 180, priceMode: "ADD" },
        ],
      },
      designUploadGroup,
      dueDateGroup,
      notesGroup,
    ],
  },
  {
    slug: "uv-printing",
    name: "طباعة UV على الأسطح الصلبة",
    category: "stickers",
    shortDescription: "طباعة UV مباشرة على الأكريليك والخشب والمعدن والزجاج.",
    description:
      "طباعة UV مباشرة بجودة عالية على الأسطح الصلبة: الأكريليك، الخشب، المعدن، الزجاج، والبلاستيك. الحبر يجفّ فورًا بالأشعة فوق البنفسجية فينتج لونًا ثابتًا ومقاومًا للخدش، مع إمكانية الطباعة البارزة.",
    priceMode: "QUOTE_ONLY",
    unit: "قطعة",
    minQuantity: 1,
    leadTime: "٣ – ٧ أيام عمل",
    groups: [
      {
        name: "نوع السطح",
        key: "surface",
        values: [
          { label: "أكريليك", value: "أكريليك", isDefault: true },
          { label: "خشب", value: "خشب" },
          { label: "معدن", value: "معدن" },
          { label: "زجاج", value: "زجاج" },
          { label: "أخرى", value: "أخرى" },
        ],
      },
      { name: "المقاس المطلوب", key: "size", type: "TEXT", helpText: "الطول × العرض بالسنتيمتر." },
      designUploadGroup,
      notesGroup,
    ],
  },
  {
    slug: "acrylic-sign",
    name: "لوحة أكريليك مقصوصة",
    category: "acrylic",
    shortDescription: "لوحات وستاندات أكريليك بقص ليزر دقيق وحفر أو طباعة.",
    description:
      "قص وحفر الأكريليك بماكينة ليزر بدقة عالية، مع خيارات الطباعة المباشرة أو الحفر أو الحروف المركّبة. تُستخدم للوحات المكاتب، ستاندات المنيو، اللوحات الإرشادية، والديكورات الداخلية. نوفّر خدمة التركيب داخل المدينة.",
    priceMode: "QUOTE_ONLY",
    unit: "لوحة",
    minQuantity: 1,
    leadTime: "٤ – ٨ أيام عمل",
    isFeatured: true,
    groups: [
      {
        name: "سماكة الأكريليك",
        key: "thickness",
        values: [
          { label: "٣ مم", value: "٣ مم" },
          { label: "٥ مم", value: "٥ مم", isDefault: true },
          { label: "٨ مم", value: "٨ مم" },
          { label: "١٠ مم", value: "١٠ مم" },
        ],
      },
      {
        name: "أسلوب التنفيذ",
        key: "technique",
        values: [
          { label: "طباعة UV مباشرة", value: "طباعة UV", isDefault: true },
          { label: "حفر ليزر", value: "حفر ليزر" },
          { label: "حروف مركّبة", value: "حروف مركّبة" },
        ],
      },
      { name: "المقاس المطلوب", key: "size", type: "TEXT", helpText: "الطول × العرض بالسنتيمتر." },
      {
        name: "التركيب",
        key: "installation",
        isRequired: false,
        values: [
          { label: "بدون تركيب", value: "بدون تركيب", isDefault: true },
          { label: "مع التركيب داخل المدينة", value: "مع التركيب" },
        ],
      },
      designUploadGroup,
      notesGroup,
    ],
  },
  {
    slug: "illuminated-sign",
    name: "لوحة محل مضيئة",
    category: "signage",
    shortDescription: "لوحة واجهة بحروف بارزة وإضاءة LED — تصميم وتصنيع وتركيب.",
    description:
      "لوحة واجهة محل تُصمَّم وتُصنَّع وتُركَّب بالكامل، بحروف بارزة من الأكريليك أو الاستانلس مع إضاءة LED موفّرة للطاقة. نراعي اشتراطات الأمانة في المقاسات والتثبيت، ونوفّر ضمانًا على الإضاءة. يتطلب معاينة أو مقاسات دقيقة لإصدار عرض السعر.",
    priceMode: "QUOTE_ONLY",
    unit: "لوحة",
    minQuantity: 1,
    leadTime: "٧ – ١٥ يوم عمل",
    isFeatured: true,
    groups: [
      {
        name: "نوع اللوحة",
        key: "signType",
        values: [
          { label: "حروف بارزة أكريليك", value: "حروف بارزة أكريليك", isDefault: true },
          { label: "حروف استانلس", value: "حروف استانلس" },
          { label: "لوحة فلكس مضيئة", value: "لوحة فلكس مضيئة" },
          { label: "لوحة لايت بوكس", value: "لايت بوكس" },
        ],
      },
      { name: "مقاس الواجهة", key: "size", type: "TEXT", helpText: "العرض × الارتفاع بالمتر." },
      {
        name: "التركيب",
        key: "installation",
        values: [
          { label: "مع التركيب", value: "مع التركيب", isDefault: true },
          { label: "توريد فقط", value: "توريد فقط" },
        ],
      },
      designUploadGroup,
      notesGroup,
    ],
  },
  {
    slug: "flex-banner",
    name: "بنر فلكس مطبوع",
    category: "flex-banners",
    shortDescription: "بنر فلكس بمقاسات كبيرة وألوان ثابتة تتحمل الظروف الخارجية.",
    description:
      "طباعة فلكس بمقاسات كبيرة بدقة عالية وألوان ثابتة مقاومة للشمس والمطر، مع تشطيب الحواف وتركيب الحلقات المعدنية. يُسعَّر بالمتر المربع.",
    priceMode: "STARTS_FROM",
    basePrice: 28,
    unit: "متر مربع",
    minQuantity: 1,
    leadTime: "٢ – ٤ أيام عمل",
    tiers: [
      { minQty: 1, maxQty: 9, unitPrice: 28, label: "١ – ٩ م²" },
      { minQty: 10, maxQty: 29, unitPrice: 24, label: "١٠ – ٢٩ م²" },
      { minQty: 30, maxQty: null, unitPrice: 19, label: "٣٠ م² فأكثر" },
    ],
    groups: [
      {
        name: "نوع الخامة",
        key: "material",
        values: [
          { label: "فلكس عادي", value: "فلكس عادي", isDefault: true },
          { label: "فلكس مضيء (Backlit)", value: "فلكس مضيء", priceModifier: 12, priceMode: "ADD_PER_UNIT" },
          { label: "مش (Mesh) مثقّب", value: "مش مثقّب", priceModifier: 8, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "التشطيب",
        key: "finish",
        isRequired: false,
        values: [
          { label: "قص فقط", value: "قص فقط", isDefault: true },
          { label: "خياطة حواف + حلقات", value: "خياطة وحلقات", priceModifier: 6, priceMode: "ADD_PER_UNIT" },
        ],
      },
      { name: "المقاس المطلوب", key: "size", type: "TEXT", helpText: "العرض × الارتفاع بالمتر." },
      designUploadGroup,
      notesGroup,
    ],
  },
  {
    slug: "printed-tshirt",
    name: "تيشيرت مطبوع بالشعار",
    category: "apparel",
    shortDescription: "طباعة على التيشيرتات القطنية بتقنية DTF أو السلك سكرين.",
    description:
      "تيشيرتات قطنية بجودة عالية تُطبع بشعارك بتقنية DTF للكميات الصغيرة والألوان المتدرّجة، أو السلك سكرين للكميات الكبيرة. مناسبة للزي الموحّد والفعاليات والحملات التسويقية.",
    priceMode: "STARTS_FROM",
    basePrice: 38,
    unit: "قطعة",
    minQuantity: 10,
    quantityStep: 5,
    leadTime: "٤ – ٧ أيام عمل",
    tiers: [
      { minQty: 10, maxQty: 49, unitPrice: 38, label: "١٠ – ٤٩ قطعة" },
      { minQty: 50, maxQty: 199, unitPrice: 31, label: "٥٠ – ١٩٩ قطعة" },
      { minQty: 200, maxQty: null, unitPrice: 25, label: "٢٠٠ قطعة فأكثر" },
    ],
    groups: [
      {
        name: "المقاس",
        key: "size",
        type: "CHECKBOX",
        helpText: "اختر المقاسات المطلوبة، وحدّد عدد كل مقاس في الملاحظات.",
        values: [
          { label: "S", value: "S" },
          { label: "M", value: "M", isDefault: true },
          { label: "L", value: "L", isDefault: true },
          { label: "XL", value: "XL" },
          { label: "2XL", value: "2XL", priceModifier: 4, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "لون التيشيرت",
        key: "color",
        type: "COLOR",
        values: [
          { label: "أبيض", value: "أبيض", swatchHex: "#FFFFFF", isDefault: true },
          { label: "أسود", value: "أسود", swatchHex: "#111111" },
          { label: "كحلي", value: "كحلي", swatchHex: "#1E293B" },
          { label: "رمادي", value: "رمادي", swatchHex: "#9CA3AF" },
          { label: "أحمر", value: "أحمر", swatchHex: "#B91C1C" },
        ],
      },
      {
        name: "تقنية الطباعة",
        key: "technique",
        values: [
          { label: "DTF (مناسبة للكميات الصغيرة)", value: "DTF", isDefault: true },
          { label: "سلك سكرين (للكميات الكبيرة)", value: "سلك سكرين", priceModifier: -3, priceMode: "ADD_PER_UNIT" },
          { label: "تطريز", value: "تطريز", priceModifier: 9, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "مواضع الطباعة",
        key: "positions",
        type: "CHECKBOX",
        isRequired: false,
        values: [
          { label: "الصدر", value: "الصدر", isDefault: true },
          { label: "الظهر", value: "الظهر", priceModifier: 7, priceMode: "ADD_PER_UNIT" },
          { label: "الكم", value: "الكم", priceModifier: 5, priceMode: "ADD_PER_UNIT" },
        ],
      },
      designUploadGroup,
      dueDateGroup,
      notesGroup,
    ],
  },
  {
    slug: "promotional-pens",
    name: "أقلام دعائية مطبوعة",
    category: "promotional-gifts",
    shortDescription: "أقلام معدنية أو بلاستيكية مطبوعة أو محفورة بشعار منشأتك.",
    description:
      "أقلام دعائية بخيارات معدنية وبلاستيكية، تُطبع أو تُحفر بالليزر بشعار منشأتك. خيار اقتصادي وفعّال للمعارض والمؤتمرات والهدايا المؤسسية.",
    priceMode: "STARTS_FROM",
    basePrice: 4.2,
    unit: "قلم",
    minQuantity: 100,
    quantityStep: 50,
    leadTime: "٥ – ٨ أيام عمل",
    tiers: [
      { minQty: 100, maxQty: 499, unitPrice: 4.2, label: "١٠٠ – ٤٩٩ قلمًا" },
      { minQty: 500, maxQty: 999, unitPrice: 3.4, label: "٥٠٠ – ٩٩٩ قلمًا" },
      { minQty: 1000, maxQty: null, unitPrice: 2.7, label: "١٠٠٠ قلم فأكثر" },
    ],
    groups: [
      {
        name: "نوع القلم",
        key: "penType",
        values: [
          { label: "بلاستيك", value: "بلاستيك", isDefault: true },
          { label: "معدني", value: "معدني", priceModifier: 6, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "أسلوب الطباعة",
        key: "technique",
        values: [
          { label: "طباعة سلك سكرين", value: "سلك سكرين", isDefault: true },
          { label: "حفر ليزر", value: "حفر ليزر", priceModifier: 2.5, priceMode: "ADD_PER_UNIT" },
        ],
      },
      designUploadGroup,
      notesGroup,
    ],
  },
  {
    slug: "thermal-mugs",
    name: "أكواب حرارية دعائية",
    category: "promotional-gifts",
    shortDescription: "أكواب حرارية ستانلس مطبوعة أو محفورة بالشعار مع علبة هدية.",
    description:
      "أكواب حرارية من الستانلس ستيل مزدوج الجدار تحافظ على حرارة المشروب، تُطبع بتقنية UV أو تُحفر بالليزر بشعار منشأتك، وتُغلَّف في علبة هدية أنيقة. خيار مميز للهدايا المؤسسية.",
    priceMode: "STARTS_FROM",
    basePrice: 38,
    unit: "كوب",
    minQuantity: 25,
    quantityStep: 25,
    leadTime: "٦ – ١٠ أيام عمل",
    tiers: [
      { minQty: 25, maxQty: 99, unitPrice: 38, label: "٢٥ – ٩٩ كوبًا" },
      { minQty: 100, maxQty: 299, unitPrice: 32, label: "١٠٠ – ٢٩٩ كوبًا" },
      { minQty: 300, maxQty: null, unitPrice: 27, label: "٣٠٠ كوب فأكثر" },
    ],
    groups: [
      {
        name: "السعة",
        key: "capacity",
        values: [
          { label: "٣٥٠ مل", value: "٣٥٠ مل", isDefault: true },
          { label: "٥٠٠ مل", value: "٥٠٠ مل", priceModifier: 6, priceMode: "ADD_PER_UNIT" },
        ],
      },
      {
        name: "اللون",
        key: "color",
        type: "COLOR",
        values: [
          { label: "أسود", value: "أسود", swatchHex: "#111111", isDefault: true },
          { label: "فضي", value: "فضي", swatchHex: "#C0C4C8" },
          { label: "أبيض", value: "أبيض", swatchHex: "#FFFFFF" },
        ],
      },
      {
        name: "علبة هدية",
        key: "giftBox",
        isRequired: false,
        values: [
          { label: "بدون علبة", value: "بدون علبة", isDefault: true },
          { label: "مع علبة هدية", value: "مع علبة هدية", priceModifier: 7, priceMode: "ADD_PER_UNIT" },
        ],
      },
      designUploadGroup,
      notesGroup,
    ],
  },
];

async function seedProducts(categories: Map<string, string>) {
  for (const [index, product] of PRODUCTS.entries()) {
    const categoryId = categories.get(product.category);
    if (!categoryId) throw new Error(`تصنيف غير موجود: ${product.category}`);

    const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
    if (existing) continue;

    await prisma.product.create({
      data: {
        slug: product.slug,
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        categoryId,
        priceMode: product.priceMode,
        basePrice: product.basePrice ?? 0,
        unit: product.unit ?? "قطعة",
        minQuantity: product.minQuantity ?? 1,
        quantityStep: product.quantityStep ?? 1,
        leadTime: product.leadTime,
        isFeatured: product.isFeatured ?? false,
        order: index,
        seoTitle: `${product.name} | طلب وطباعة أونلاين`,
        seoDescription: product.shortDescription,
        quantityTiers: {
          create: (product.tiers ?? []).map((tier, tierIndex) => ({
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            unitPrice: tier.unitPrice,
            label: tier.label,
            order: tierIndex,
          })),
        },
        optionGroups: {
          create: (product.groups ?? []).map((group, groupIndex) => ({
            name: group.name,
            key: group.key,
            type: group.type ?? "SELECT",
            isRequired: group.isRequired ?? true,
            helpText: group.helpText,
            order: groupIndex,
            values: {
              create: (group.values ?? []).map((value, valueIndex) => ({
                label: value.label,
                value: value.value,
                priceModifier: value.priceModifier ?? 0,
                priceMode: value.priceMode ?? "ADD_PER_UNIT",
                swatchHex: value.swatchHex,
                isDefault: value.isDefault ?? false,
                order: valueIndex,
              })),
            },
          })),
        },
      },
    });
  }

  console.log(`  • ${PRODUCTS.length} منتج مع خياراتها وشرائح أسعارها`);
}

// ---------------------------------------------------------------------------
// الخدمات
// ---------------------------------------------------------------------------

const SERVICES = [
  {
    slug: "boxes-packaging-printing",
    title: "طباعة البوكسات والتغليف",
    iconKey: "box",
    shortDescription:
      "تصميم وتصنيع وطباعة بوكسات وعلب تغليف بمقاسات وخامات تناسب منتجك وعلامتك التجارية.",
    description:
      "نغطّي دورة التغليف كاملة: من دراسة مقاس المنتج واختيار الخامة المناسبة، إلى تصميم قالب القص والثنيات، ثم الطباعة والتشطيب والتجميع. نعمل بخامات متعددة السماكة تشمل الكرتون المقوّى والمضلّع والكرافت الطبيعي، مع تشطيبات لامعة ومطفية وتذهيب UV موضعي. نراجع كل تصميم فنيًا قبل الإنتاج للتأكد من دقة الأبعاد والهوامش وجودة الألوان.",
    highlights: [
      "قوالب قص حسب مقاس منتجك بالضبط",
      "خامات متعددة السماكة معتمدة للتغليف الغذائي",
      "تشطيبات: سلوفان لامع ومطفي وتذهيب UV",
      "مراجعة فنية للتصميم قبل الطباعة",
    ],
    products: ["printed-carton-box", "luxury-gift-box"],
  },
  {
    slug: "cups-printing",
    title: "الأكواب الورقية والبلاستيكية",
    iconKey: "cup",
    shortDescription:
      "أكواب مشروبات ساخنة وباردة مطبوعة بشعارك بخامات آمنة غذائيًا ومقاسات متعددة.",
    description:
      "طباعة أكواب المشروبات الساخنة والباردة بجودة عالية وألوان ثابتة لا تتأثر بالحرارة أو التكثّف. نستخدم خامات آمنة غذائيًا، ونوفّر الأحجام من ٤ إلى ٢٢ أونصة مع الأغطية والحاملات. الطباعة تغطي محيط الكوب كاملاً بدقة تُظهر تفاصيل الشعار.",
    highlights: [
      "خامات آمنة غذائيًا",
      "طباعة ٣٦٠ درجة حول الكوب",
      "أحجام من ٤ إلى ٢٢ أونصة",
      "توفير الأغطية والحاملات",
    ],
    products: ["paper-cup-8oz", "plastic-cup-printed"],
  },
  {
    slug: "paper-printing",
    title: "المطبوعات الورقية",
    iconKey: "document",
    shortDescription:
      "كروت شخصية، بروشورات، فواتير، ودفاتر بجودة طباعة عالية وتسليم سريع.",
    description:
      "مطبوعات المكاتب والتسويق بكل أنواعها: الكروت الشخصية، البروشورات، الفلايرات، دفاتر الفواتير الكربونية المرقّمة، الأظرف، وأوراق المراسلات الرسمية. نطبع بدقة عالية على خامات متدرجة الجودة، ونوفّر تشطيبات السلوفان والتذهيب والتنقيط البارز.",
    highlights: [
      "تسليم سريع للكروت خلال ٢ – ٣ أيام عمل",
      "خامات من الكوشيه إلى المخملي والكرافت",
      "دفاتر فواتير مرقّمة تسلسليًا",
      "تشطيبات: سلوفان، تذهيب، تنقيط بارز",
    ],
    products: ["business-cards", "brochure-a4", "invoice-books"],
  },
  {
    slug: "stickers-labels",
    title: "الاستيكرات والملصقات",
    iconKey: "sticker",
    shortDescription:
      "استيكرات لاصقة وشفافة مقاومة للماء بقص حسب الشكل للمنتجات والعبوات.",
    description:
      "طباعة وقص الاستيكرات بكل أنواعها: الفينيل اللامع والمطفي، الشفاف، الذهبي والفضي، والاستيكرات المقاومة للماء والحرارة. نوفّر القص حسب الشكل (Die Cut) بأي تصميم، والتوريد على شكل رول أو شيتات حسب طريقة استخدامك.",
    highlights: [
      "قص حسب الشكل بأي تصميم",
      "خامات مقاومة للماء وأشعة الشمس",
      "توريد على رول أو شيتات",
      "استيكرات شفافة وذهبية وفضية",
    ],
    products: ["vinyl-stickers"],
  },
  {
    slug: "uv-printing-service",
    title: "طباعة UV",
    iconKey: "sparkles",
    shortDescription:
      "طباعة مباشرة على الأسطح الصلبة: أكريليك، خشب، معدن، وزجاج بألوان ثابتة.",
    description:
      "تقنية الطباعة بالأشعة فوق البنفسجية تتيح الطباعة مباشرة على الأسطح الصلبة دون وسيط لاصق. الحبر يجفّ فورًا فينتج لونًا ثابتًا مقاومًا للخدش والبهتان، مع إمكانية الطباعة البارزة لإضافة ملمس ثلاثي الأبعاد. مناسبة للوحات واللافتات والهدايا والديكورات.",
    highlights: [
      "طباعة مباشرة بلا وسيط لاصق",
      "ألوان ثابتة مقاومة للخدش",
      "إمكانية الطباعة البارزة ثلاثية الأبعاد",
      "تعمل على الأكريليك والخشب والمعدن والزجاج",
    ],
    products: ["uv-printing"],
  },
  {
    slug: "acrylic-cutting",
    title: "قص وطباعة الأكريليك",
    iconKey: "layers",
    shortDescription: "قص ليزر دقيق وحفر وطباعة على الأكريليك للوحات والستاندات.",
    description:
      "قص الأكريليك بماكينة ليزر بدقة عالية وحواف نظيفة لا تحتاج صنفرة، مع خيارات الحفر والطباعة المباشرة والحروف المركّبة. نعمل بسماكات من ٣ إلى ١٠ مم، وننفّذ لوحات المكاتب وستاندات المنيو واللوحات الإرشادية والديكورات الداخلية، مع خدمة التركيب داخل المدينة.",
    highlights: [
      "قص ليزر بحواف نظيفة",
      "سماكات من ٣ إلى ١٠ مم",
      "حفر وطباعة وحروف مركّبة",
      "خدمة التركيب داخل المدينة",
    ],
    products: ["acrylic-sign"],
  },
  {
    slug: "signage",
    title: "اللوحات الإعلانية والمضيئة",
    iconKey: "sign",
    shortDescription:
      "لوحات محلات وحروف بارزة ولوحات LED مضيئة — تصميم وتصنيع وتركيب.",
    description:
      "ننفّذ لوحات الواجهات كاملة: من المعاينة وأخذ المقاسات، إلى التصميم والتصنيع والتركيب. نوفّر الحروف البارزة من الأكريليك والاستانلس، ولوحات اللايت بوكس، ولوحات الفلكس المضيئة، بإضاءة LED موفّرة للطاقة. نراعي اشتراطات الأمانة في المقاسات وطرق التثبيت، ونقدّم ضمانًا على الإضاءة.",
    highlights: [
      "معاينة وأخذ مقاسات في الموقع",
      "حروف بارزة أكريليك واستانلس",
      "إضاءة LED موفّرة مع ضمان",
      "مراعاة اشتراطات الأمانة",
    ],
    products: ["illuminated-sign"],
  },
  {
    slug: "flex-banners-printing",
    title: "طباعة الفلكس والبنرات",
    iconKey: "banner",
    shortDescription:
      "طباعة بمقاسات كبيرة على الفلكس والمش وخامات الرول أب بألوان تتحمّل الخارج.",
    description:
      "طباعة المقاسات الكبيرة على الفلكس العادي والمضيء والمش المثقّب، بألوان ثابتة مقاومة للشمس والمطر. نوفّر تشطيب الحواف بالخياطة وتركيب الحلقات المعدنية، بالإضافة إلى ستاندات الرول أب والبوب أب للمعارض والفعاليات.",
    highlights: [
      "طباعة بعرض كبير بدقة عالية",
      "ألوان تتحمّل الشمس والمطر",
      "خياطة حواف وحلقات معدنية",
      "ستاندات رول أب وبوب أب",
    ],
    products: ["flex-banner"],
  },
  {
    slug: "apparel-printing",
    title: "الطباعة على الملابس",
    iconKey: "shirt",
    shortDescription:
      "طباعة وتطريز على التيشيرتات والكابات والزي الموحّد بكميات صغيرة وكبيرة.",
    description:
      "نطبع على الملابس بتقنيات متعددة نختار بينها حسب الكمية ونوع التصميم: DTF للكميات الصغيرة والتصاميم متعددة الألوان، والسلك سكرين للكميات الكبيرة بتكلفة أقل للقطعة، والتطريز للزي الرسمي والكابات. نوفّر القطع أو نطبع على قطعك.",
    highlights: [
      "DTF للكميات الصغيرة والتصاميم المتدرّجة",
      "سلك سكرين للكميات الكبيرة",
      "تطريز للزي الرسمي والكابات",
      "إمكانية الطباعة على قطعك الخاصة",
    ],
    products: ["printed-tshirt"],
  },
  {
    slug: "promotional-gifts",
    title: "الهدايا الدعائية",
    iconKey: "gift",
    shortDescription:
      "أقلام وأكواب حرارية وأجندات وحقائب مطبوعة بشعار منشأتك للمعارض والمناسبات.",
    description:
      "نوفّر ونطبع الهدايا الدعائية المؤسسية: الأقلام المعدنية والبلاستيكية، الأكواب الحرارية، الأجندات، الحقائب، وحوامل البطاقات. نطبع بالسلك سكرين أو نحفر بالليزر حسب الخامة، ونوفّر التغليف في علب هدايا للمناسبات الرسمية.",
    highlights: [
      "تشكيلة واسعة من الأصناف",
      "حفر ليزر أو طباعة حسب الخامة",
      "تغليف في علب هدايا",
      "مناسبة للمعارض والمؤتمرات",
    ],
    products: ["promotional-pens", "thermal-mugs"],
  },
  {
    slug: "custom-design-print",
    title: "التصميم والطباعة حسب الطلب",
    iconKey: "pen",
    shortDescription:
      "فريق تصميم يحوّل فكرتك إلى ملف جاهز للطباعة، أو يجهّز ملفك القائم فنيًا.",
    description:
      "إن لم يكن لديك تصميم جاهز، يتولّى فريقنا تصميمه من الصفر بناءً على هويتك ومتطلباتك. وإن كان لديك ملف، نراجعه فنيًا: دقة الألوان، الهوامش، حدود القص، ودقة الصور، ونصلح ما يلزم قبل الإنتاج. هذه المراجعة تمنع أخطاء الطباعة المكلفة قبل حدوثها.",
    highlights: [
      "تصميم من الصفر حسب هويتك",
      "مراجعة فنية لملفاتك قبل الطباعة",
      "ضبط الألوان وحدود القص والهوامش",
      "تسليم ملفات جاهزة للإنتاج",
    ],
    products: [],
  },
];

async function seedServices() {
  for (const [index, service] of SERVICES.entries()) {
    const existing = await prisma.service.findUnique({ where: { slug: service.slug } });
    if (existing) continue;

    await prisma.service.create({
      data: {
        slug: service.slug,
        title: service.title,
        shortDescription: service.shortDescription,
        description: service.description,
        iconKey: service.iconKey,
        highlights: service.highlights,
        order: index,
        seoTitle: `${service.title} | خدمات الطباعة`,
        seoDescription: service.shortDescription,
        products: {
          connect: service.products.map((slug) => ({ slug })),
        },
      },
    });
  }

  console.log(`  • ${SERVICES.length} خدمة`);
}

// ---------------------------------------------------------------------------
// تصنيفات معرض الأعمال
// ---------------------------------------------------------------------------

const PROJECT_CATEGORIES = [
  { slug: "boxes", name: "بوكسات وتغليف" },
  { slug: "cups", name: "أكواب" },
  { slug: "signs", name: "لوحات" },
  { slug: "acrylic", name: "أكريليك" },
  { slug: "paper", name: "مطبوعات ورقية" },
  { slug: "stickers", name: "استيكرات" },
  { slug: "gifts", name: "هدايا دعائية" },
  { slug: "apparel", name: "طباعة ملابس" },
  { slug: "special", name: "مشاريع خاصة" },
];

async function seedProjectCategories() {
  for (const [index, category] of PROJECT_CATEGORIES.entries()) {
    await prisma.projectCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: { slug: category.slug, name: category.name, order: index },
    });
  }
  console.log(`  • ${PROJECT_CATEGORIES.length} تصنيف لمعرض الأعمال`);
  console.log(
    `    ↳ لم تُضَف مشاريع — معرض الأعمال ينتظر صور أعمالكم الحقيقية ${NEEDS}`,
  );
}

// ---------------------------------------------------------------------------
// المعدات
// ---------------------------------------------------------------------------

const EQUIPMENT = [
  {
    name: "ماكينة طباعة أوفست أربعة ألوان",
    description:
      "تُستخدم في المطبوعات الورقية والبوكسات بكميات كبيرة، وتعطي دقة ألوان عالية وثباتًا في التدرّجات عبر الكمية كاملة.",
    specs: [
      { label: "أقصى مقاس ورق", value: "٧٠ × ١٠٠ سم" },
      { label: "عدد الوحدات اللونية", value: "٤ (CMYK)" },
      { label: "الإنتاجية", value: "حتى ١٣٠٠٠ ورقة/ساعة" },
    ],
  },
  {
    name: "ماكينة طباعة UV مسطّحة",
    description:
      "تطبع مباشرة على الأسطح الصلبة كالأكريليك والخشب والمعدن والزجاج، مع إمكانية الطباعة البارزة والحبر الأبيض.",
    specs: [
      { label: "مساحة الطباعة", value: "١٢٠ × ٢٥٠ سم" },
      { label: "أقصى سماكة", value: "١٠ سم" },
      { label: "الحبر", value: "UV مع حبر أبيض وورنيش" },
    ],
  },
  {
    name: "ماكينة قص ليزر",
    description:
      "لقص وحفر الأكريليك والخشب بدقة عالية وحواف نظيفة لا تحتاج معالجة إضافية.",
    specs: [
      { label: "مساحة العمل", value: "١٣٠ × ٢٥٠ سم" },
      { label: "دقة القص", value: "±٠٫١ مم" },
      { label: "أقصى سماكة أكريليك", value: "٢٠ مم" },
    ],
  },
  {
    name: "ماكينة طباعة سوليفنت بعرض كبير",
    description: "لطباعة الفلكس والبنرات والاستيكرات بمقاسات كبيرة وألوان تتحمّل الخارج.",
    specs: [
      { label: "عرض الطباعة", value: "٣٢٠ سم" },
      { label: "الدقة", value: "حتى ١٤٤٠ dpi" },
      { label: "الخامات", value: "فلكس، مش، فينيل، ورق" },
    ],
  },
  {
    name: "ماكينة قص وتكسير (Die Cutting)",
    description:
      "لتنفيذ قوالب القص والثنيات في البوكسات وعلب التغليف بدقة تضمن تطابق التجميع.",
    specs: [
      { label: "أقصى مقاس", value: "٧٠ × ١٠٠ سم" },
      { label: "الضغط", value: "حتى ٣٠٠ طن" },
    ],
  },
  {
    name: "ماكينة تغليف حراري (سلوفان)",
    description:
      "لتشطيب المطبوعات بالسلوفان اللامع والمطفي، ما يحمي السطح ويرفع جودة الملمس والمظهر.",
    specs: [
      { label: "أقصى عرض", value: "١١٠ سم" },
      { label: "الأنواع", value: "لامع، مطفي، مخملي" },
    ],
  },
];

async function seedEquipment() {
  const count = await prisma.equipment.count();
  if (count > 0) return;

  for (const [index, item] of EQUIPMENT.entries()) {
    await prisma.equipment.create({
      data: {
        name: item.name,
        description: item.description,
        specs: item.specs,
        order: index,
      },
    });
  }
  console.log(`  • ${EQUIPMENT.length} ماكينة`);
}

// ---------------------------------------------------------------------------
// الأسئلة الشائعة
// ---------------------------------------------------------------------------

const FAQS = [
  {
    category: "الطلب",
    question: "كيف أطلب منتجًا من الموقع؟",
    answer:
      "اختر المنتج، ثم حدّد المقاس والخامة والكمية وبقية الخيارات — سيتحدّث السعر أمامك لحظيًا. أضف المنتج إلى السلة وأكمل بياناتك في صفحة إتمام الطلب. إن كان المنتج يحتاج مراجعة مواصفات، سيظهر لك زر «طلب عرض سعر» بدلًا من زر الشراء.",
  },
  {
    category: "الطلب",
    question: "لماذا بعض المنتجات بسعر مباشر وبعضها بعرض سعر؟",
    answer:
      "المنتجات ذات المواصفات القياسية (كالكروت والأكواب والاستيكرات) لها سعر محسوب مباشرة. أما المنتجات التي يعتمد سعرها على التصميم والمقاس وطريقة التركيب (كاللوحات المضيئة والأكريليك والعلب الفاخرة) فنراجع مواصفاتها أولًا لنعطيك سعرًا دقيقًا بدل تقدير تقريبي.",
  },
  {
    category: "التصميم",
    question: "ليس لديّ تصميم جاهز، هل تساعدونني؟",
    answer:
      "نعم. فريق التصميم لدينا يصمّم من الصفر بناءً على هويتك ومتطلباتك. وإن كان لديك ملف جاهز، نراجعه فنيًا ونضبط الألوان والهوامش وحدود القص قبل الإنتاج.",
  },
  {
    category: "التصميم",
    question: "ما صيغ الملفات التي تقبلونها؟",
    answer:
      "نفضّل ملفات PDF أو AI أو PSD بدقة ٣٠٠ dpi على الأقل مع هوامش قص ٣ مم. نقبل أيضًا الصور عالية الدقة بصيغة PNG أو JPG. إن كان ملفك بصيغة أخرى أو دقة أقل، سنراجعه ونخبرك بما يلزم قبل الطباعة.",
  },
  {
    category: "التنفيذ",
    question: "كم يستغرق تنفيذ الطلب؟",
    answer:
      "تختلف المدة حسب المنتج والكمية، وهي مذكورة في صفحة كل منتج. الكروت الشخصية تُسلَّم خلال ٢ – ٣ أيام عمل، والبوكسات والأكواب من ٥ إلى ١٠ أيام، واللوحات المضيئة من ٧ إلى ١٥ يومًا. تبدأ المدة بعد اعتماد التصميم النهائي وتأكيد الطلب.",
  },
  {
    category: "التنفيذ",
    question: "هل يمكنني رؤية عيّنة قبل تنفيذ الكمية كاملة؟",
    answer:
      "نعم، نوفّر عيّنة مطبوعة للكميات الكبيرة قبل بدء الإنتاج. العيّنة تُحتسب بتكلفتها وتُخصم من قيمة الطلب النهائي عند اعتماده.",
  },
  {
    category: "الدفع",
    question: "ما طرق الدفع المتاحة؟",
    answer:
      "التحويل البنكي، والدفع عند الاستلام من الفرع. الدفع الإلكتروني بالبطاقة مُجهّز تقنيًا في الموقع وسيُفعَّل فور اكتمال ربط بوابة الدفع.",
  },
  {
    category: "الدفع",
    question: "هل الأسعار شاملة ضريبة القيمة المضافة؟",
    answer:
      "الأسعار المعروضة شاملة ضريبة القيمة المضافة ١٥٪، ويظهر تفصيلها في صفحة إتمام الطلب وفي الفاتورة الضريبية التي تُصدر مع كل طلب.",
  },
  {
    category: "الشحن",
    question: "هل تشحنون لجميع مدن المملكة؟",
    answer:
      "نعم، نشحن إلى جميع مدن المملكة عبر شركات شحن معتمدة. تُحسب تكلفة الشحن حسب المدينة وتظهر لك في صفحة إتمام الطلب قبل التأكيد. كما يمكنك اختيار الاستلام المباشر من مقرّنا دون رسوم.",
  },
  {
    category: "الشحن",
    question: "هل يمكنني استلام الطلب من الفرع؟",
    answer:
      "نعم. اختر «الاستلام من الفرع» عند إتمام الطلب، وسنرسل لك رسالة عند جاهزية الطلب مع العنوان وأوقات الاستلام.",
  },
  {
    category: "الاسترجاع",
    question: "هل يمكن استرجاع المنتجات المطبوعة؟",
    answer:
      "المنتجات المُصنَّعة حسب الطلب لا تقبل الاسترجاع لأنها تُنتَج خصيصًا لك ولا يمكن إعادة بيعها. لكن إن كان هناك خطأ في التنفيذ من طرفنا أو عيب في الخامة، نعيد الطباعة على حسابنا. راجع سياسة الاستبدال والاسترجاع للتفاصيل.",
  },
  {
    category: "الكميات",
    question: "هل يوجد حد أدنى للكمية؟",
    answer:
      "نعم، ويختلف حسب المنتج وهو مذكور في صفحته. الحد الأدنى موجود لأن تكاليف التجهيز (القوالب وضبط الألوان) ثابتة بغض النظر عن الكمية. كلما زادت الكمية انخفض سعر الوحدة، وتجد الشرائح موضّحة في صفحة كل منتج.",
  },
];

async function seedFaqs() {
  const count = await prisma.faq.count();
  if (count > 0) return;

  for (const [index, faq] of FAQS.entries()) {
    await prisma.faq.create({
      data: {
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        order: index,
      },
    });
  }
  console.log(`  • ${FAQS.length} سؤالاً شائعًا`);
}

// ---------------------------------------------------------------------------
// تقييمات العملاء — قوالب غير معتمدة، لا تظهر في الموقع
// ---------------------------------------------------------------------------

async function seedTestimonials() {
  const count = await prisma.testimonial.count();
  if (count > 0) return;

  const templates = [
    { authorName: `اسم العميل ${NEEDS}`, companyName: `اسم المنشأة ${NEEDS}`, city: "الرياض" },
    { authorName: `اسم العميل ${NEEDS}`, companyName: `اسم المنشأة ${NEEDS}`, city: "جدة" },
    { authorName: `اسم العميل ${NEEDS}`, companyName: `اسم المنشأة ${NEEDS}`, city: "الدمام" },
  ];

  for (const [index, template] of templates.entries()) {
    await prisma.testimonial.create({
      data: {
        authorName: template.authorName,
        companyName: template.companyName,
        city: template.city,
        rating: 5,
        content: `نص التقييم الحقيقي للعميل ${NEEDS} — استبدل هذا النص برأي عميل فعلي ثم اعتمد التقييم ليظهر في الموقع.`,
        isApproved: false,
        order: index,
      },
    });
  }

  console.log("  • ٣ قوالب تقييمات (غير معتمدة — لا تظهر في الموقع حتى تُستبدل وتُعتمد)");
}

// ---------------------------------------------------------------------------
// الصفحات الثابتة
// ---------------------------------------------------------------------------

const PAGES = [
  {
    slug: "privacy",
    title: "سياسة الخصوصية",
    content: `> ⚠️ هذه مسوّدة مهنية تحتاج مراجعة قانونية قبل النشر ${NEEDS}

## البيانات التي نجمعها

نجمع البيانات التي تزوّدنا بها مباشرة عند إرسال طلب أو طلب عرض سعر أو التواصل معنا، وتشمل: الاسم، رقم الجوال، البريد الإلكتروني، اسم المنشأة، المدينة وعنوان التوصيل، وملفات التصاميم التي ترفعها.

كما نجمع بيانات تقنية محدودة تلقائيًا مثل نوع المتصفح والصفحات التي زرتها، وذلك لتحسين أداء الموقع فقط.

## كيف نستخدم بياناتك

- تنفيذ طلبك وتجهيزه وشحنه.
- التواصل معك بخصوص طلبك أو عرض السعر.
- إصدار الفاتورة الضريبية النظامية.
- تحسين خدماتنا وتجربة الموقع.

## ملفات التصاميم

ملفات التصاميم التي ترفعها تُستخدم حصريًا لتنفيذ طلبك. لا نشاركها مع أي طرف ثالث ولا نستخدمها في أعمالنا التسويقية أو معرض أعمالنا إلا بموافقتك الصريحة.

## مشاركة البيانات

لا نبيع بياناتك ولا نؤجّرها. نشاركها فقط في الحدود اللازمة مع:

- شركات الشحن — الاسم والعنوان ورقم الجوال لتوصيل الطلب.
- بوابات الدفع — بيانات الدفع تُعالَج مباشرة لدى البوابة ولا نحتفظ ببيانات بطاقتك.
- الجهات الحكومية — عند وجود التزام نظامي يقتضي ذلك.

## حماية البيانات

نطبّق إجراءات تقنية وتنظيمية لحماية بياناتك، وتشمل التشفير أثناء النقل والتحقق من الملفات المرفوعة وتقييد الوصول الداخلي.

## حقوقك

لك الحق في طلب الاطلاع على بياناتك أو تصحيحها أو حذفها، وذلك بمراسلتنا عبر بيانات التواصل الموضّحة في صفحة اتصل بنا.

## ملفات الارتباط (Cookies)

يستخدم الموقع ملفات ارتباط أساسية لحفظ محتويات سلّتك وتفضيلاتك. يمكنك تعطيلها من إعدادات متصفحك، مع العلم أن ذلك قد يمنع عمل السلة.

## التعديلات

قد نحدّث هذه السياسة، وسيظهر تاريخ آخر تحديث أسفل الصفحة.`,
  },
  {
    slug: "terms",
    title: "الشروط والأحكام",
    content: `> ⚠️ هذه مسوّدة مهنية تحتاج مراجعة قانونية قبل النشر ${NEEDS}

## نطاق الخدمة

نقدّم خدمات الطباعة والتجهيزات الدعائية داخل المملكة العربية السعودية، وتشمل التصميم والتصنيع والطباعة والتركيب حسب نوع المنتج.

## الطلبات وتأكيدها

- يُعدّ الطلب مؤكدًا بعد اعتماد التصميم النهائي وسداد المستحق أو الاتفاق على طريقة السداد.
- تبدأ مدة التنفيذ من تاريخ التأكيد لا من تاريخ إنشاء الطلب.
- أي تعديل على التصميم بعد بدء الإنتاج قد يترتب عليه تكلفة إضافية وتأخير في التسليم.

## التصاميم والملكية الفكرية

- يقرّ العميل بأنه يملك حقوق استخدام التصاميم والشعارات التي يرفعها، ويتحمّل كامل المسؤولية القانونية عن أي مخالفة لحقوق الغير.
- نحتفظ بحق رفض تنفيذ أي محتوى مخالف للأنظمة أو الآداب العامة.
- التصاميم التي ينفّذها فريقنا تنتقل ملكية استخدامها للعميل بعد سداد قيمتها كاملة.

## دقة الألوان

قد يوجد اختلاف طفيف بين الألوان كما تظهر على الشاشة وكما تُطبع فعليًا، ويرجع ذلك لاختلاف أنظمة الألوان (RGB مقابل CMYK) وطبيعة الخامة. هذا الاختلاف ضمن الحدود الفنية المقبولة ولا يُعدّ عيبًا في التنفيذ. للطلبات الحساسة لونيًا ننصح بطلب عيّنة مطبوعة قبل تنفيذ الكمية.

## الكميات

قد يوجد فارق في الكمية المسلَّمة بنسبة لا تتجاوز ٥٪ زيادة أو نقصانًا في الطلبات كبيرة الكمية، وهو فارق فني معتاد في صناعة الطباعة. يُحاسَب العميل على الكمية المسلَّمة فعليًا.

## الأسعار والضريبة

- الأسعار المعروضة بالريال السعودي وشاملة ضريبة القيمة المضافة ١٥٪.
- تخضع الأسعار للتغيير، والسعر المعتمد هو السعر وقت تأكيد الطلب.

## التسليم

- مدد التنفيذ المذكورة تقديرية بناءً على ظروف التشغيل المعتادة.
- لا نتحمّل مسؤولية التأخير الناتج عن ظروف خارجة عن إرادتنا كتأخر شركات الشحن أو انقطاع التوريد.

## الإلغاء

- يمكن إلغاء الطلب قبل بدء الإنتاج مع استرداد كامل المبلغ.
- بعد بدء الإنتاج لا يمكن الإلغاء لأن المنتج مُصنَّع خصيصًا للعميل.

## القانون الواجب التطبيق

تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتختص الجهات القضائية السعودية بالنظر في أي نزاع.`,
  },
  {
    slug: "returns",
    title: "سياسة الاستبدال والاسترجاع",
    content: `> ⚠️ هذه مسوّدة مهنية تحتاج مراجعة قانونية قبل النشر ${NEEDS}

## طبيعة المنتجات المطبوعة

جميع منتجاتنا تُصنَّع حسب طلب العميل وبمواصفاته وتصميمه، ولا يمكن إعادة بيعها لعميل آخر. لذلك، ووفقًا لنظام التجارة الإلكترونية السعودي الذي يستثني السلع المصنوعة حسب الطلب من حق الانسحاب، لا تقبل هذه المنتجات الاسترجاع لمجرد تغيير الرأي.

## الحالات التي نعيد فيها التنفيذ على حسابنا

نتحمّل كامل المسؤولية ونعيد الطباعة أو نستبدل المنتج دون أي تكلفة عليك في الحالات التالية:

- خطأ في التنفيذ يخالف التصميم المعتمد.
- عيب في الخامة أو جودة الطباعة.
- اختلاف جوهري في المقاس عن المتفق عليه.
- تلف المنتج أثناء الشحن.

## الحالات التي لا تشملها المسؤولية

- أخطاء إملائية أو لغوية موجودة في التصميم الذي اعتمده العميل.
- اختلاف طفيف في درجة اللون ضمن الحدود الفنية المقبولة.
- تغيير العميل لرأيه في التصميم أو المواصفات بعد بدء الإنتاج.
- سوء الاستخدام أو التخزين بعد الاستلام.

## مدة تقديم الطلب

يُقدَّم طلب الاستبدال خلال **٧ أيام** من تاريخ الاستلام، مرفقًا برقم الطلب وصور توضّح المشكلة.

## آلية التقديم

1. تواصل معنا عبر واتساب أو صفحة اتصل بنا مرفقًا رقم الطلب.
2. أرفق صورًا واضحة توضّح الخلل.
3. نراجع الحالة خلال يومي عمل ونبلّغك بالقرار.
4. عند القبول نبدأ إعادة التنفيذ فورًا حسب أولوية الطلبات العاجلة.

## استرداد المبالغ

في الحالات التي يتعذّر فيها إعادة التنفيذ، يُسترد المبلغ بنفس وسيلة الدفع خلال ٧ – ١٤ يوم عمل حسب سياسة البنك أو بوابة الدفع.`,
  },
  {
    slug: "shipping",
    title: "سياسة الشحن والتوصيل",
    content: `> ⚠️ راجع تكاليف الشحن ومدده وفق اتفاقك مع شركة الشحن ${NEEDS}

## خيارات الاستلام

### الاستلام من الفرع
يمكنك استلام طلبك مباشرة من مقرّنا دون أي رسوم. نرسل لك رسالة عند جاهزية الطلب مع العنوان وأوقات الاستلام.

### الشحن والتوصيل
نشحن إلى جميع مدن المملكة العربية السعودية عبر شركات شحن معتمدة.

## تكلفة الشحن

تُحسب تكلفة الشحن حسب مدينة التوصيل ووزن الطلب وحجمه، وتظهر لك بوضوح في صفحة إتمام الطلب قبل التأكيد النهائي — لا توجد أي رسوم مخفية.

المنتجات كبيرة الحجم (كاللوحات والبنرات الكبيرة) قد تتطلب ترتيب شحن خاص، وسنتواصل معك لتنسيقه.

## مدة التوصيل

مدة التوصيل تبدأ **بعد** انتهاء مدة التنفيذ الموضّحة في صفحة المنتج، وليس من تاريخ الطلب.

| المنطقة | المدة التقديرية |
|---|---|
| داخل المدينة | ١ – ٢ يوم عمل |
| المدن الرئيسية | ٢ – ٤ أيام عمل |
| باقي مناطق المملكة | ٣ – ٦ أيام عمل |

## تتبّع الشحنة

نرسل لك رقم تتبّع الشحنة عبر واتساب أو الرسائل النصية فور تسليم الطلب لشركة الشحن.

## التركيب

المنتجات التي تتطلب تركيبًا — كاللوحات المضيئة والحروف البارزة — يُنسَّق موعد تركيبها مع فريقنا الفني بعد وصول الطلب.

## استلام الشحنة

يُرجى فحص الطلب عند الاستلام. في حال وجود تلف ظاهر في التغليف، وثّق ذلك بصور وأبلغنا خلال ٤٨ ساعة لنتمكّن من متابعة الأمر مع شركة الشحن.`,
  },
];

async function seedPages() {
  for (const page of PAGES) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: {
        slug: page.slug,
        title: page.title,
        content: page.content,
        seoTitle: page.title,
        seoDescription: `${page.title} — اطّلع على التفاصيل الكاملة.`,
      },
    });
  }
  console.log(`  • ${PAGES.length} صفحات سياسات (مسوّدات تحتاج مراجعة قانونية)`);
}

// ---------------------------------------------------------------------------
// مناطق الشحن
// ---------------------------------------------------------------------------

async function seedShipping() {
  const count = await prisma.shippingZone.count();
  if (count > 0) return;

  const zones = [
    {
      name: "داخل الرياض",
      cities: ["الرياض", "الخرج"],
      cost: 25,
      freeOverAmount: 500,
      estimatedDays: "١ – ٢ يوم عمل",
    },
    {
      name: "المدن الرئيسية",
      cities: ["جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "الظهران", "الطائف", "بريدة", "الأحساء"],
      cost: 35,
      freeOverAmount: 800,
      estimatedDays: "٢ – ٤ أيام عمل",
    },
    {
      name: "باقي مناطق المملكة",
      cities: ["حائل", "تبوك", "أبها", "خميس مشيط", "نجران", "جازان", "الباحة", "سكاكا", "عرعر", "ينبع", "القطيف", "الجبيل", "عنيزة"],
      cost: 45,
      freeOverAmount: 1000,
      estimatedDays: "٣ – ٦ أيام عمل",
    },
  ];

  for (const [index, zone] of zones.entries()) {
    await prisma.shippingZone.create({ data: { ...zone, order: index } });
  }
  console.log(`  • ${zones.length} مناطق شحن ${NEEDS} (راجع التكاليف)`);
}

// ---------------------------------------------------------------------------
// حساب المدير
// ---------------------------------------------------------------------------

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe!2026";

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`  • حساب المدير موجود مسبقًا (${email})`);
    return;
  }

  await prisma.adminUser.create({
    data: {
      email,
      passwordHash: await hash(password, 12),
      name: "مدير النظام",
      role: "OWNER",
    },
  });

  console.log("  • حساب المدير");
  console.log(`    ↳ البريد: ${email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`    ↳ كلمة المرور: ${password}`);
    console.log("    ⚠️  غيّرها فورًا بعد أول دخول، أو اضبط ADMIN_PASSWORD في .env قبل التهيئة.");
  }
}

main()
  .catch((error) => {
    console.error("✖ فشلت التهيئة:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
