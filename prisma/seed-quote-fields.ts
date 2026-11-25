/**
 * حقول قالب نموذج طلب عرض السعر.
 *
 * تُنشئ حقول النظام — وهي الحقول التي كانت مثبّتة في الكود سابقًا — كصفوف
 * قابلة للتحرير من لوحة التحكم. بعدها تستطيع الإدارة إعادة تسميتها وإخفاءها
 * وإعادة ترتيبها وجعلها إلزامية، وإضافة حقول جديدة بحرية.
 *
 * التشغيل:  npm run db:seed:quote
 */

import "dotenv/config";

import type { PrismaClient } from "../src/generated/prisma/client";
import { createPrismaClient } from "../src/lib/data/create-client";

const FIELDS = [
  {
    key: "companyName",
    label: "اسم المنشأة",
    type: "TEXT",
    width: "HALF",
    isRequired: false,
    placeholder: "اسم الشركة أو المتجر",
    helpText: null,
    options: null,
  },
  {
    key: "email",
    label: "البريد الإلكتروني",
    type: "EMAIL",
    width: "HALF",
    isRequired: false,
    placeholder: "name@example.com",
    helpText: null,
    options: null,
  },
  {
    key: "productType",
    label: "نوع المنتج أو الخدمة",
    type: "SELECT",
    width: "HALF",
    isRequired: true,
    placeholder: null,
    helpText: "اترك الخيارات فارغة لتُملأ تلقائيًا من الخدمات وأقسام المنتجات.",
    options: null,
  },
  {
    key: "size",
    label: "المقاس",
    type: "TEXT",
    width: "HALF",
    isRequired: false,
    placeholder: "مثال: ٢٠×٢٠×٨ سم",
    helpText: null,
    options: null,
  },
  {
    key: "quantity",
    label: "الكمية المطلوبة",
    type: "TEXT",
    width: "HALF",
    isRequired: false,
    placeholder: "مثال: ١٠٠٠ قطعة",
    helpText: null,
    options: null,
  },
  {
    key: "dueDate",
    label: "موعد التسليم المطلوب",
    type: "DATE",
    width: "HALF",
    isRequired: false,
    placeholder: null,
    helpText: "اتركه فارغًا إن لم يكن لديك موعد محدد.",
    options: null,
  },
  {
    key: "preferredContact",
    label: "طريقة التواصل المفضّلة",
    type: "RADIO",
    width: "FULL",
    isRequired: false,
    placeholder: null,
    helpText: null,
    options: ["واتساب", "اتصال هاتفي", "البريد الإلكتروني"],
  },
];

/** يُستدعى من prisma/seed.ts، ويعمل مستقلاً كذلك (انظر أسفل الملف). */
export async function seedQuoteFields(prisma: PrismaClient) {
  for (const [index, field] of FIELDS.entries()) {
    await prisma.quoteFormField.upsert({
      where: { key: field.key },
      // لا نلمس الحقول الموجودة — قد تكون الإدارة عدّلتها
      update: {},
      create: {
        key: field.key,
        label: field.label,
        type: field.type,
        width: field.width,
        isRequired: field.isRequired,
        placeholder: field.placeholder,
        helpText: field.helpText,
        options: field.options ?? undefined,
        isSystem: true,
        isActive: true,
        order: index,
      },
    });
  }

  const total = await prisma.quoteFormField.count();
  console.log(`  • حقول قالب عرض السعر: ${total}`);
}

// التشغيل المباشر فقط — الاستيراد من seed.ts لا يشغّل شيئًا
if (require.main === module) {
  const prisma = createPrismaClient();
  seedQuoteFields(prisma)
    .catch((error) => {
      console.error("✖ فشلت التهيئة:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
