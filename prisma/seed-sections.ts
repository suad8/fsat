/**
 * أقسام الصفحة الرئيسية.
 *
 * تُنشئ صفًّا لكل قسم موجود في الكود ليصبح قابلاً للإظهار والإخفاء وإعادة
 * الترتيب وتعديل العناوين من لوحة التحكم.
 *
 * التشغيل:  npx tsx prisma/seed-sections.ts
 */

import "dotenv/config";

import type { PrismaClient } from "../src/generated/prisma/client";
import { createPrismaClient } from "../src/lib/data/create-client";

const SECTIONS = [
  { key: "products", isActive: true },
  { key: "portfolio", isActive: true },
  { key: "services", isActive: false }, // أُخفي بطلب العميل سابقًا
  { key: "whyUs", isActive: true },
  { key: "orderSteps", isActive: true },
  { key: "testimonials", isActive: true },
  { key: "contact", isActive: true },
];

/** يُستدعى من prisma/seed.ts، ويعمل مستقلاً كذلك (انظر أسفل الملف). */
export async function seedSections(prisma: PrismaClient) {
  for (const [index, section] of SECTIONS.entries()) {
    await prisma.homeSection.upsert({
      where: { key: section.key },
      update: {},
      create: { key: section.key, isActive: section.isActive, order: index },
    });
  }

  const total = await prisma.homeSection.count();
  console.log(`  • أقسام الصفحة الرئيسية: ${total}`);
}

// التشغيل المباشر فقط — الاستيراد من seed.ts لا يشغّل شيئًا
if (require.main === module) {
  const prisma = createPrismaClient();
  seedSections(prisma)
    .catch((error) => {
      console.error("✖ فشلت التهيئة:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
