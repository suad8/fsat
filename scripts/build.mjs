#!/usr/bin/env node
/**
 * بناء الإنتاج.
 *
 * صفحات المتجر تُولَّد ثابتة وقت البناء من قاعدة البيانات، لذا يجب أن تكون قاعدة
 * البناء بمخطط حديث ومحتوى متسق. إن لم يُحدَّد DATABASE_URL نُنشئ قاعدة SQLite مؤقتة
 * (هجرات + نفس بذر التشغيل الأول) فلا يعتمد البناء على dev.db المتتبَّع في git ولا
 * يفشل بسبب مخطط قديم. صفحات الموقع ديناميكية (force-dynamic في
 * src/app/(site)/layout.tsx) فلا يُخبز محتوى قاعدة البناء.
 *
 * إن حُدِّد DATABASE_URL (مثلًا PostgreSQL) نبني عليه كما هو دون لمس بياناته.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["prisma", "generate"]);

let tempDir = null;
let env = {};

if (!process.env.DATABASE_URL) {
  tempDir = mkdtempSync(join(tmpdir(), "fsat-build-"));
  const url = `file:${join(tempDir, "build.db")}`;
  env = { DATABASE_URL: url };
  console.log("› قاعدة بناء مؤقتة:", url);

  run("npx", ["prisma", "migrate", "deploy"], env);
  // البذر لا يُنشئ كلمة مرور حقيقية: قاعدة البناء تُحذف بعد البناء
  run("npx", ["tsx", "prisma/seed.ts"], {
    ...env,
    NODE_ENV: "development",
    ADMIN_EMAIL: "build@localhost.invalid",
    ADMIN_PASSWORD: randomBytes(18).toString("base64url") + "aA1!",
  });
}

try {
  run("npx", ["next", "build"], env);
} finally {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
}
