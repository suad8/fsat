import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * عميل Prisma مفرد.
 *
 * في وضع التطوير يعيد Next.js تحميل الوحدات عند كل تعديل، وإنشاء عميل جديد
 * في كل مرة يستنفد اتصالات قاعدة البيانات. تخزينه على globalThis يمنع ذلك.
 *
 * Prisma 7 يتطلب محوّل تعريف (driver adapter) صريحًا. للانتقال إلى PostgreSQL
 * استبدل المحوّل بـ @prisma/adapter-pg وغيّر provider في schema.prisma —
 * لا يتغيّر أي استعلام في التطبيق.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = new PrismaBetterSqlite3({ url });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
