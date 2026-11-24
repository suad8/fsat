/**
 * أدوات اختبارات البيانات.
 *
 * كل ملف اختبار يعمل في عملية مستقلة (tsx --test) ويُنشئ قاعدة SQLite مؤقتة
 * فارغة تُطبَّق عليها الهجرات الحقيقية (prisma migrate deploy)، فتُختبر الهجرات
 * نفسها مع المنطق. لا يُلمس dev.db ولا أي قاعدة أخرى.
 *
 * ⚠️ يجب استدعاء setupTestDb() قبل أول import ديناميكي لـ "@/lib/prisma"،
 *    لأن العميل المفرد يقرأ DATABASE_URL لحظة تحميل الوحدة.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export type TestDb = {
  url: string;
  dir: string;
  cleanup: () => Promise<void>;
};

export async function setupTestDb(): Promise<TestDb> {
  const dir = mkdtempSync(path.join(tmpdir(), "fsat-data-test-"));
  const url = `file:${path.join(dir, "test.db")}`;

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });

  process.env.DATABASE_URL = url;

  return {
    url,
    dir,
    cleanup: async () => {
      const { prisma } = await import("@/lib/prisma");
      await prisma.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** بيانات أساسية: تصنيف، منتجان (بشرائح وخيارات)، شحن، كوبونات، إعدادات. */
export async function seedFixtures() {
  const { prisma } = await import("@/lib/prisma");

  await prisma.siteSettings.create({
    data: { id: "singleton", companyName: "اختبار", vatRate: 0.15, pricesIncludeVat: true },
  });

  const category = await prisma.category.create({
    data: { slug: "cards", name: "كروت" },
  });

  const cards = await prisma.product.create({
    data: {
      slug: "business-cards",
      name: "كروت شخصية",
      categoryId: category.id,
      priceMode: "STARTS_FROM",
      basePrice: 0.5,
      minQuantity: 100,
      quantityStep: 100,
      quantityTiers: {
        create: [
          { minQty: 100, maxQty: 499, unitPrice: 0.45, order: 0 },
          { minQty: 500, maxQty: 999, unitPrice: 0.3, order: 1 },
          { minQty: 1000, maxQty: null, unitPrice: 0.2, order: 2 },
        ],
      },
      optionGroups: {
        create: [
          {
            name: "الورق",
            key: "paper",
            type: "SELECT",
            isRequired: true,
            order: 0,
            values: {
              create: [
                { label: "كوشيه ٣٠٠", value: "كوشيه ٣٠٠", priceModifier: 0, isDefault: true },
                { label: "كوشيه ٣٥٠", value: "كوشيه ٣٥٠", priceModifier: 0.06 },
              ],
            },
          },
          {
            name: "وجه الطباعة",
            key: "sides",
            type: "RADIO",
            isRequired: true,
            order: 1,
            values: {
              create: [
                { label: "وجه واحد", value: "وجه واحد", isDefault: true },
                { label: "وجهان", value: "وجهان", priceModifier: 1.35, priceMode: "MULTIPLY" },
              ],
            },
          },
        ],
      },
    },
    include: { optionGroups: { include: { values: true } } },
  });

  const quoteOnly = await prisma.product.create({
    data: {
      slug: "neon-sign",
      name: "لوحة مضيئة",
      categoryId: category.id,
      priceMode: "QUOTE_ONLY",
    },
  });

  await prisma.shippingZone.createMany({
    data: [
      { name: "الرياض", cities: ["الرياض"], cost: 25, freeOverAmount: 500 },
      { name: "باقي المملكة", cities: ["حائل"], cost: 45, freeOverAmount: null },
    ],
  });

  const day = 24 * 60 * 60 * 1000;
  await prisma.coupon.createMany({
    data: [
      { code: "SAVE10", type: "PERCENT", value: 10 },
      { code: "FIXED20", type: "FIXED", value: 20, minOrderAmount: 100 },
      { code: "EXPIRED", type: "PERCENT", value: 50, expiresAt: new Date(Date.now() - day) },
      { code: "FUTURE", type: "PERCENT", value: 50, startsAt: new Date(Date.now() + day) },
      { code: "ONCE", type: "FIXED", value: 5, maxUses: 1 },
      { code: "OFF", type: "PERCENT", value: 50, isActive: false },
      { code: "BROKEN", type: "PERCENT", value: 250 },
    ],
  });

  return { prisma, category, cards, quoteOnly };
}

/** يبني بيانات إتمام الطلب كما يصل بعد تحقّق Zod. */
export function checkoutData(
  productId: string,
  overrides: Record<string, unknown> = {},
  itemOverrides: Record<string, unknown> = {},
) {
  return {
    customerName: "عميل اختبار",
    customerPhone: "966500000001",
    fulfillment: "DELIVERY" as const,
    city: "الرياض",
    addressLine: "حي النخيل",
    paymentMethod: "BANK_TRANSFER" as const,
    acceptTerms: true as const,
    items: [
      {
        productId,
        quantity: 500,
        selection: { paper: "كوشيه ٣٠٠", sides: "وجه واحد" } as Record<string, string | string[]>,
        ...itemOverrides,
      },
    ],
    ...overrides,
  };
}
