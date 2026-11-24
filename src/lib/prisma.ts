import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/data/create-client";

/**
 * ============================================================================
 *  عميل Prisma المفرد
 * ============================================================================
 *  Prisma 7 يتطلب محوّل تعريف (driver adapter) صريحًا. نوع القاعدة يُستنتج من
 *  بروتوكول DATABASE_URL فلا حاجة لمتغيّر إضافي (المنطق في
 *  src/lib/data/create-client.ts):
 *
 *    file:./dev.db                   ← SQLite (الافتراضي، @prisma/adapter-better-sqlite3)
 *    postgres://… أو postgresql://…  ← PostgreSQL (@prisma/adapter-pg)
 *
 *  ⚠️ التحويل إلى PostgreSQL يحتاج خطوات لا يكفي فيها تغيير الرابط وحده
 *  (provider في المخطط، اعتماديتان، هجرات جديدة، نقل البيانات). كلها موثّقة
 *  في docs/DATA.md قسم «الانتقال إلى PostgreSQL». محوّل pg يُحمَّل عند الطلب
 *  فقط، فلا يتأثر المشروع الحالي ولا يُضاف أي اعتماد قبل الانتقال.
 *
 *  في وضع التطوير يعيد Next.js تحميل الوحدات عند كل تعديل، وإنشاء عميل جديد
 *  في كل مرة يستنفد الاتصالات. تخزينه على globalThis يمنع ذلك.
 * ============================================================================
 */

export { createPrismaClient, detectDatabaseKind, type DatabaseKind } from "@/lib/data/create-client";

export type PrismaTx = Prisma.TransactionClient;
/** يقبل العميل العادي أو عميل المعاملة — لدوال تعمل داخل المعاملة وخارجها. */
export type DbClient = PrismaClient | PrismaTx;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
