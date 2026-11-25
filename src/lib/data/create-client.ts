import { createRequire } from "node:module";
import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * مصنع عميل Prisma — منفصل عن العميل المفرد (src/lib/prisma.ts) كي تستعمله
 * السكربتات (البذر، النسخ، الاختبارات) دون أن يفتح استيرادها اتصالاً ثانيًا
 * بالقاعدة الافتراضية. التفاصيل (اختيار المحوّل بحسب DATABASE_URL، الانتقال
 * إلى PostgreSQL) في تعليق src/lib/prisma.ts وdocs/DATA.md.
 */

export type DatabaseKind = "sqlite" | "postgresql";

type DriverAdapter = NonNullable<
  NonNullable<ConstructorParameters<typeof PrismaClient>[0]>["adapter"]
>;

const DEFAULT_URL = "file:./dev.db";

export function detectDatabaseKind(url: string): DatabaseKind {
  return /^postgres(ql)?:\/\//i.test(url) ? "postgresql" : "sqlite";
}

function loadPostgresAdapter(url: string) {
  // require ديناميكي عمدًا: الحزمة غير مثبّتة قبل الانتقال، ولا نريد أن يفشل
  // البناء أو التحليل الساكن بسببها.
  const nodeRequire = createRequire(path.join(process.cwd(), "package.json"));

  let adapterModule: { PrismaPg: new (config: { connectionString: string }) => unknown };
  try {
    adapterModule = nodeRequire("@prisma/adapter-pg");
  } catch {
    throw new Error(
      "DATABASE_URL يشير إلى PostgreSQL لكن @prisma/adapter-pg غير مثبّت. " +
        "نفّذ: npm install @prisma/adapter-pg pg — وراجع docs/DATA.md.",
    );
  }

  return new adapterModule.PrismaPg({ connectionString: url });
}

/**
 * ينشئ عميلًا جديدًا. يُستعمل في التطبيق (عبر `prisma` المفرد أدناه)
 * وفي السكربتات (البذر، الاختبارات، النسخ الاحتياطي) التي تفتح قاعدتها بنفسها.
 */
export function createPrismaClient(url: string = process.env.DATABASE_URL ?? DEFAULT_URL) {
  const kind = detectDatabaseKind(url);

  // better-sqlite3 يتعامل مع قفل الكتابة بمهلة انتظار (busy timeout) —
  // نرفعها من ٥ إلى ١٠ ثوانٍ كي لا يفشل طلبان متزامنان من عمليتين.
  const adapter =
    kind === "postgresql"
      ? loadPostgresAdapter(url)
      : new PrismaBetterSqlite3({ url, timeout: 10_000 });

  const client = new PrismaClient({
    // أنواع المحوّلين تختلف شكليًا؛ العقد الفعلي واحد (SqlDriverAdapterFactory)
    adapter: adapter as DriverAdapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // WAL يسمح بقراءة متزامنة أثناء الكتابة (مفيد في الإنتاج على SQLite).
  // اختياري لأنه يغيّر ملف القاعدة ويُنشئ ملفَّي -wal و-shm بجانبه؛ سكربت
  // النسخ الاحتياطي (scripts/backup.sh) يتعامل معه بشكل صحيح.
  if (kind === "sqlite" && process.env.SQLITE_WAL === "1") {
    void client.$queryRawUnsafe("PRAGMA journal_mode = WAL").catch(() => {
      // لا نمنع التشغيل لأجل تحسين اختياري
    });
  }

  return client;
}

