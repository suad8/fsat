#!/usr/bin/env node
/**
 * أدوات SQLite المساندة لـ scripts/backup.sh — بلا حاجة لـ sqlite3 CLI.
 *
 *   node scripts/sqlite-tool.mjs backup <src.db> <dest.db>
 *       نسخة متّسقة عبر واجهة النسخ الاحتياطي في SQLite (تعمل والتطبيق يكتب،
 *       وتتعامل مع WAL)، ثم تفحص سلامتها (تُتجاوز بـ --skip-check كنسخة أمان).
 *   node scripts/sqlite-tool.mjs check <file.db>
 *       PRAGMA integrity_check + foreign_key_check؛ تخرج بـ 1 عند أي خلل.
 *   node scripts/sqlite-tool.mjs summary <file.db>
 *       JSON: عدد الصفوف في الجداول الرئيسية وآخر هجرة مطبّقة.
 *
 * يستعمل better-sqlite3 المثبّت أصلاً كاعتماد لمحوّل Prisma.
 */

import { createRequire } from "node:module";
import { existsSync, rmSync } from "node:fs";

const require = createRequire(import.meta.url);

function open(path, options) {
  const Database = require("better-sqlite3");
  return new Database(path, options);
}

function check(path) {
  const db = open(path, { readonly: true, fileMustExist: true });
  try {
    const integrity = db.pragma("integrity_check");
    const foreignKeys = db.pragma("foreign_key_check");
    const ok = integrity.length === 1 && integrity[0].integrity_check === "ok";
    return { ok: ok && foreignKeys.length === 0, integrity, foreignKeyViolations: foreignKeys.length };
  } finally {
    db.close();
  }
}

const [command, a, b, flag] = process.argv.slice(2);

try {
  if (command === "backup") {
    if (!a || !b) throw new Error("usage: backup <src.db> <dest.db>");
    if (!existsSync(a)) throw new Error(`القاعدة غير موجودة: ${a}`);
    if (existsSync(b)) rmSync(b);

    const db = open(a, { readonly: true, fileMustExist: true });
    try {
      await db.backup(b);
    } finally {
      db.close();
    }

    // --skip-check: نسخة أمان لقاعدة قد تكون تالفة — نحفظها كما هي دون رفضها
    const result = flag === "--skip-check" ? { ok: true } : check(b);
    if (!result.ok) {
      console.error("✖ النسخة الناتجة فشلت فحص السلامة:", JSON.stringify(result));
      process.exit(1);
    }
    console.log(`✔ نسخة متّسقة: ${b}`);
  } else if (command === "check") {
    if (!a) throw new Error("usage: check <file.db>");
    const result = check(a);
    console.log(JSON.stringify(result));
    process.exit(result.ok ? 0 : 1);
  } else if (command === "summary") {
    if (!a) throw new Error("usage: summary <file.db>");
    const db = open(a, { readonly: true, fileMustExist: true });
    try {
      const count = (table) => db.prepare(`select count(*) c from "${table}"`).get().c;
      const last = db
        .prepare(
          "select migration_name from _prisma_migrations where finished_at is not null order by finished_at desc limit 1",
        )
        .get();
      console.log(
        JSON.stringify({
          orders: count("Order"),
          products: count("Product"),
          customers: count("Customer"),
          lastMigration: last?.migration_name ?? null,
        }),
      );
    } finally {
      db.close();
    }
  } else {
    throw new Error("الأوامر: backup | check | summary");
  }
} catch (error) {
  console.error(`✖ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
