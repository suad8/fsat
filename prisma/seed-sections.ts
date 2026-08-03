/**
 * أقسام الصفحة الرئيسية.
 *
 * تُنشئ صفًّا لكل قسم موجود في الكود ليصبح قابلاً للإظهار والإخفاء وإعادة
 * الترتيب وتعديل العناوين من لوحة التحكم.
 *
 * التشغيل:  npx tsx prisma/seed-sections.ts
 */

import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

const SECTIONS = [
  { key: "products", isActive: true },
  { key: "portfolio", isActive: true },
  { key: "services", isActive: false }, // أُخفي بطلب العميل سابقًا
  { key: "whyUs", isActive: true },
  { key: "orderSteps", isActive: true },
  { key: "testimonials", isActive: true },
  { key: "contact", isActive: true },
];

async function main() {
  for (const [index, section] of SECTIONS.entries()) {
    await prisma.homeSection.upsert({
      where: { key: section.key },
      update: {},
      create: { key: section.key, isActive: section.isActive, order: index },
    });
  }

  const total = await prisma.homeSection.count();
  console.log(`✔ أقسام الصفحة الرئيسية: ${total}`);
}

main()
  .catch((error) => {
    console.error("✖ فشلت التهيئة:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
