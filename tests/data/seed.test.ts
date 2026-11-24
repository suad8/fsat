/**
 * اختبارات التهيئة (البذر): تُشغَّل prisma/seed.ts فعليًا على قاعدة فارغة
 * مهيّأة بالهجرات، ثم تُفحص جودة البيانات وسياسة حساب الإدارة في الإنتاج.
 *
 * التشغيل:  npx tsx --test tests/data/seed.test.ts
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { after, before, describe, it } from "node:test";

import { checkAdminPassword, isPlaceholderEmail } from "@/lib/data/password-policy";

import { setupTestDb, type TestDb } from "./helpers";

let db: TestDb;

function runSeed(env: Record<string, string | undefined>) {
  return spawnSync("npx", ["tsx", "prisma/seed.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: db.url, ...env },
    encoding: "utf8",
  });
}

before(async () => {
  db = await setupTestDb();
});

after(async () => {
  await db.cleanup();
});

describe("password policy", () => {
  it("rejects the old default and weak passwords in production", () => {
    for (const weak of ["ChangeMe!2026", "password123", "short1!A", "aaaaaaaaaaaaaaaa"]) {
      assert.equal(checkAdminPassword(weak, { production: true }).ok, false, weak);
    }
  });

  it("rejects passwords containing the email name and single-class passwords", () => {
    assert.equal(
      checkAdminPassword("Owner-2026-Shop!!", { email: "owner@x.sa", production: true }).ok,
      false,
    );
    assert.equal(checkAdminPassword("abcdefghijklmnop", { production: true }).ok, false);
  });

  it("accepts a strong password", () => {
    assert.equal(
      checkAdminPassword("Tr1cky-Pr!nt-Shop-77", { email: "boss@golden.sa", production: true }).ok,
      true,
    );
  });

  it("flags placeholder emails", () => {
    assert.equal(isPlaceholderEmail("admin@example.com"), true);
    assert.equal(isPlaceholderEmail("me@shop.test"), true);
    assert.equal(isPlaceholderEmail("owner@golden.sa"), false);
  });
});

describe("placeholder stripping", () => {
  it("removes the marker and draft warning banners from customer-visible text", async () => {
    // استيراد ديناميكي: الوحدة تفتح عميل Prisma عند تحميلها (انظر helpers.ts)
    const { hasPlaceholder, stripPlaceholders } = await import("@/lib/data/placeholders");
    const raw = "> ⚠️ هذه مسوّدة [[يحتاج استبدال]]\n\n## البيانات\n\nنص حقيقي [[يحتاج استبدال]]\n\n\n\nخاتمة";
    const clean = stripPlaceholders(raw);
    assert.equal(hasPlaceholder(clean), false);
    assert.ok(!clean.includes("⚠️"));
    assert.ok(clean.startsWith("## البيانات"));
    assert.ok(!clean.includes("\n\n\n"));
  });
});

describe("seed data quality (development mode)", () => {
  it("seeds a coherent store with no fake customer-facing content", async () => {
    const result = runSeed({ NODE_ENV: "development", ADMIN_EMAIL: "", ADMIN_PASSWORD: "" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const { prisma } = await import("@/lib/prisma");

    // لا بيانات تجريبية
    assert.equal(await prisma.category.count({ where: { name: "هه" } }), 0, "junk category");
    const categories = await prisma.category.findMany();
    assert.ok(categories.every((category) => category.name.trim().length > 3));

    // لا بيانات تواصل وهمية، ولا تقييمات مختلقة
    const settings = await prisma.siteSettings.findUniqueOrThrow({ where: { id: "singleton" } });
    for (const field of [settings.phone, settings.whatsapp, settings.email, settings.addressLine]) {
      assert.equal(field, null, "contact must be empty");
    }
    assert.equal(await prisma.testimonial.count(), 0, "testimonials");

    // لا علامة استبدال نصية في أي محتوى مزروع
    const { hasPlaceholder } = await import("@/lib/data/placeholders");
    const pages = await prisma.page.findMany();
    assert.ok(pages.length >= 4);
    for (const page of pages) {
      assert.equal(hasPlaceholder(page.content), false, page.slug);
      assert.ok(!page.content.includes("⚠️"), page.slug);
      assert.equal(page.needsReview, true);
    }

    // المحتوى المبدئي معلَّم للإدارة
    assert.ok((await prisma.product.count({ where: { needsReview: true } })) > 0);
    assert.equal(await prisma.shippingZone.count({ where: { needsReview: false } }), 0, "zones flagged");

    // كل منتج قابل للتسعير جدًا: وحداته ودنياه متّسقة
    const products = await prisma.product.findMany({
      include: { quantityTiers: true, optionGroups: { include: { values: true } } },
    });
    assert.ok(products.length >= 10);
    for (const product of products) {
      assert.ok(product.minQuantity >= 1 && product.quantityStep >= 1, product.slug);
      if (product.priceMode !== "QUOTE_ONLY") assert.ok(product.basePrice > 0, product.slug);
      // شرائح مرتّبة بلا تداخل
      const tiers = [...product.quantityTiers].sort((a, b) => a.minQty - b.minQty);
      for (let i = 1; i < tiers.length; i += 1) {
        assert.ok(tiers[i].minQty > (tiers[i - 1].maxQty ?? Infinity), `${product.slug} tiers`);
        assert.ok(tiers[i].unitPrice <= tiers[i - 1].unitPrice, `${product.slug} price drops with qty`);
      }
      for (const group of product.optionGroups) {
        if (group.type !== "CHECKBOX") {
          assert.ok(group.values.filter((v) => v.isDefault).length <= 1, `${product.slug}/${group.key}`);
        }
      }
    }

    // الأقسام وحقول قالب عرض السعر مزروعة (مكتفية بأمر واحد)
    assert.equal(await prisma.homeSection.count(), 7);
    assert.ok((await prisma.quoteFormField.count()) >= 7);

    // حساب الإدارة بكلمة مرور عشوائية مطبوعة، لا الافتراضية القديمة
    assert.match(result.stdout, /كلمة مرور مؤقتة/);
    assert.equal(await prisma.adminUser.count(), 1);
  });

  it("is safe to run twice and does not touch the existing admin", async () => {
    const { prisma } = await import("@/lib/prisma");
    const before = await prisma.adminUser.findFirstOrThrow();
    const productsBefore = await prisma.product.count();

    const result = runSeed({ NODE_ENV: "development" });
    assert.equal(result.status, 0, result.stderr);

    const after = await prisma.adminUser.findFirstOrThrow();
    assert.equal(after.passwordHash, before.passwordHash);
    assert.equal(await prisma.adminUser.count(), 1);
    assert.equal(await prisma.product.count(), productsBefore);
  });
});

describe("seed in production mode", () => {
  it("refuses a weak or default admin password before writing anything", async () => {
    const fresh = await setupTestDb();
    const attempt = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_URL: fresh.url,
        ADMIN_EMAIL: "owner@golden.sa",
        ADMIN_PASSWORD: "ChangeMe!2026",
      },
      encoding: "utf8",
    });
    assert.notEqual(attempt.status, 0);
    assert.match(attempt.stderr + attempt.stdout, /ADMIN_PASSWORD/);

    const missing = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "production", DATABASE_URL: fresh.url, ADMIN_EMAIL: "", ADMIN_PASSWORD: "" },
      encoding: "utf8",
    });
    assert.notEqual(missing.status, 0);

    // لم تُكتب أي بيانات في القاعدة التي رُفضت
    const { createPrismaClient } = await import("@/lib/data/create-client");
    const inspector = createPrismaClient(fresh.url);
    assert.equal(await inspector.category.count(), 0);
    assert.equal(await inspector.adminUser.count(), 0);

    // الإعداد السليم ينجح ولا يطبع كلمة المرور
    const ok = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_URL: fresh.url,
        ADMIN_EMAIL: "owner@golden.sa",
        ADMIN_PASSWORD: "Tr1cky-Pr!nt-Shop-77",
      },
      encoding: "utf8",
    });
    assert.equal(ok.status, 0, ok.stderr);
    assert.ok(!ok.stdout.includes("Tr1cky"));
    assert.equal(await inspector.adminUser.count(), 1);

    await inspector.$disconnect();
    rmSync(fresh.dir, { recursive: true, force: true });
  });
});
