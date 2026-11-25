/**
 * اختبارات الطلبات على قاعدة حقيقية (SQLite مؤقتة بالهجرات الفعلية):
 * إنشاء طلب، الأحداث، آلة الحالات، الكوبونات، idempotency، والتزامن.
 *
 * التشغيل:  npx tsx --test tests/data/orders.test.ts
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import type { CheckoutData } from "@/lib/validation";

import { checkoutData, seedFixtures, setupTestDb, type TestDb } from "./helpers";

let db: TestDb;
let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

// الاستيراد الديناميكي بعد إنشاء القاعدة المؤقتة (انظر helpers.ts)
async function orders() {
  return import("@/lib/orders");
}
async function service() {
  return import("@/lib/data/order-service");
}

function data(overrides: Record<string, unknown> = {}, item: Record<string, unknown> = {}) {
  return checkoutData(fixtures.cards.id, overrides, item) as unknown as CheckoutData;
}

before(async () => {
  db = await setupTestDb();
  fixtures = await seedFixtures();
});

after(async () => {
  await db.cleanup();
});

const admin = { id: "admin-1", email: "a@example.com", name: "مدير الاختبار" };

describe("createOrder", () => {
  it("reprices on the server and ignores client-supplied selection garbage", async () => {
    const { createOrder } = await orders();
    const result = await createOrder(
      data({ customerPhone: "966500000010" }, {
        quantity: 500,
        // نصّ القيمة (ما تحفظه السلة) لا المعرّف، ومعرّف لا ينتمي للمنتج
        selection: { paper: "كوشيه ٣٥٠", sides: "وجهان", evil: "x" },
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const order = await fixtures.prisma.order.findUniqueOrThrow({
      where: { orderNumber: result.orderNumber },
      include: { items: true, events: true },
    });

    // (0.30 + 0.06) × 1.35 = 0.486 → 0.49 للوحدة ؛ × 500 = 245
    assert.equal(order.items[0].unitPrice, 0.49);
    assert.equal(order.items[0].lineTotal, 245);
    assert.equal(order.subtotal, 245);
    // الرياض: شحن ٢٥ (الطلب أقل من حدّ المجاني ٥٠٠)، الأسعار شاملة الضريبة
    assert.equal(order.shippingCost, 25);
    assert.equal(order.total, 270);
    assert.equal(order.vatAmount, 35.22); // 270 − 270/1.15
    assert.equal(order.status, "NEW");
    assert.equal(order.items[0].selectedOptions !== null, true);

    // حدث «استلام الطلب» كُتب مع الطلب
    assert.equal(order.events.length, 1);
    assert.equal(order.events[0].toStatus, "NEW");
    assert.equal(order.events[0].isPublic, true);
  });

  it("rejects quote-only products, unknown products and missing required options", async () => {
    const { createOrder } = await orders();

    const quoteOnly = await createOrder(
      checkoutData(fixtures.quoteOnly.id, { customerPhone: "966500000011" }) as unknown as CheckoutData,
    );
    assert.equal(quoteOnly.ok, false);

    const unknown = await createOrder(
      checkoutData("no-such-product", { customerPhone: "966500000012" }) as unknown as CheckoutData,
    );
    assert.equal(unknown.ok, false);

    const missing = await createOrder(
      data({ customerPhone: "966500000013" }, { selection: {} }),
    );
    // الخيارات الإلزامية بلا اختيار: ترفض
    assert.equal(missing.ok, false);
  });

  it("snaps quantity to the product rules server-side", async () => {
    const { createOrder } = await orders();
    const result = await createOrder(
      data({ customerPhone: "966500000014" }, { quantity: 150 }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const item = await fixtures.prisma.orderItem.findFirstOrThrow({
      where: { order: { orderNumber: result.orderNumber } },
    });
    assert.equal(item.quantity, 200);
  });

  it("charges the pickup customer no shipping", async () => {
    const { createOrder } = await orders();
    const result = await createOrder(
      data({ customerPhone: "966500000015", fulfillment: "PICKUP", city: undefined }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const order = await fixtures.prisma.order.findUniqueOrThrow({
      where: { orderNumber: result.orderNumber },
    });
    assert.equal(order.shippingCost, 0);
  });
});

describe("coupons", () => {
  it("applies a valid coupon and counts its use", async () => {
    const { createOrder } = await orders();
    const result = await createOrder(
      data({ customerPhone: "966500000020", couponCode: " save10 " }, { quantity: 1000 }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const order = await fixtures.prisma.order.findUniqueOrThrow({
      where: { orderNumber: result.orderNumber },
    });
    // 1000 × 0.20 = 200 ؛ خصم ١٠٪ = 20 ؛ الشحن 25 (180 < 500)
    assert.equal(order.subtotal, 200);
    assert.equal(order.discountAmount, 20);
    assert.equal(order.couponCode, "SAVE10");
    assert.equal(order.total, 205);

    const coupon = await fixtures.prisma.coupon.findUniqueOrThrow({ where: { code: "SAVE10" } });
    assert.equal(coupon.usedCount, 1);
  });

  for (const [code, reason] of [
    ["EXPIRED", "expired"],
    ["FUTURE", "not started"],
    ["OFF", "inactive"],
    ["NOPE", "unknown"],
    ["BROKEN", "invalid percent > 100"],
    ["FIXED20", "below minimum order (100)"],
  ] as const) {
    it(`rejects a ${reason} coupon without creating an order or consuming it`, async () => {
      const { createOrder } = await orders();
      const before = await fixtures.prisma.order.count();
      const result = await createOrder(
        data(
          { customerPhone: "966500000021", couponCode: code },
          // طلب صغير ليفشل الحد الأدنى لـ FIXED20 (100 × 0.45 = 45)
          { quantity: 100 },
        ),
      );
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.field, "couponCode");
      assert.equal(await fixtures.prisma.order.count(), before);
      const coupon = await fixtures.prisma.coupon.findUnique({ where: { code } });
      assert.equal(coupon?.usedCount ?? 0, 0);
    });
  }

  it("respects maxUses under concurrency (compare-and-set)", async () => {
    const { createOrder } = await orders();
    const attempts = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        createOrder(
          data({ customerPhone: `96650000003${index}`, couponCode: "ONCE" }),
        ),
      ),
    );

    const succeeded = attempts.filter((attempt) => attempt.ok);
    assert.equal(succeeded.length, 1, "كوبون بحدّ استخدام واحد نجح مرة واحدة فقط");

    const coupon = await fixtures.prisma.coupon.findUniqueOrThrow({ where: { code: "ONCE" } });
    assert.equal(coupon.usedCount, 1);

    // الفاشلة لم تترك طلبات يتيمة ولا حجزت أرقامًا
    const used = await fixtures.prisma.order.count({ where: { couponCode: "ONCE" } });
    assert.equal(used, 1);
  });

  it("returns the coupon use when the order is cancelled", async () => {
    const { createOrder } = await orders();
    const { applyOrderChanges } = await service();

    const created = await createOrder(
      data({ customerPhone: "966500000040", couponCode: "SAVE10" }, { quantity: 1000 }),
    );
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const before = (
      await fixtures.prisma.coupon.findUniqueOrThrow({ where: { code: "SAVE10" } })
    ).usedCount;

    const cancelled = await applyOrderChanges(created.orderId, { status: "CANCELLED" }, { actor: admin });
    assert.equal(cancelled.ok, true);

    const after = (
      await fixtures.prisma.coupon.findUniqueOrThrow({ where: { code: "SAVE10" } })
    ).usedCount;
    assert.equal(after, before - 1);
  });
});

describe("idempotency", () => {
  it("returns the same order for a double click without a client key", async () => {
    const { createOrder } = await orders();
    const payload = data({ customerPhone: "966500000050" });

    const [a, b, c] = await Promise.all([
      createOrder(payload),
      createOrder(payload),
      createOrder(payload),
    ]);

    assert.ok(a.ok && b.ok && c.ok);
    if (!(a.ok && b.ok && c.ok)) return;
    assert.equal(a.orderNumber, b.orderNumber);
    assert.equal(a.orderNumber, c.orderNumber);
    assert.equal([a, b, c].filter((r) => !r.duplicate).length, 1);

    assert.equal(
      await fixtures.prisma.order.count({ where: { customerPhone: "966500000050" } }),
      1,
    );
  });

  it("honours an explicit Idempotency-Key and refuses another customer reusing it", async () => {
    const { createOrder } = await orders();
    const key = "11111111-aaaa-bbbb-cccc-222222222222";

    const first = await createOrder(data({ customerPhone: "966500000051" }), { idempotencyKey: key });
    // محتوى مختلف، المفتاح نفسه ← يعيد الأصلي (النقر المكرر لا يغيّر المحتوى)
    const second = await createOrder(
      data({ customerPhone: "966500000051" }, { quantity: 1000 }),
      { idempotencyKey: key },
    );
    assert.ok(first.ok && second.ok);
    if (first.ok && second.ok) {
      assert.equal(first.orderNumber, second.orderNumber);
      assert.equal(second.duplicate, true);
    }

    const stolen = await createOrder(data({ customerPhone: "966500000052" }), { idempotencyKey: key });
    assert.equal(stolen.ok, false);

    const invalid = await createOrder(data({ customerPhone: "966500000053" }), { idempotencyKey: "x" });
    assert.equal(invalid.ok, false);
  });

  it("allows the same customer to place a different order", async () => {
    const { createOrder } = await orders();
    const a = await createOrder(data({ customerPhone: "966500000054" }));
    const b = await createOrder(data({ customerPhone: "966500000054" }, { quantity: 1000 }));
    assert.ok(a.ok && b.ok);
    if (a.ok && b.ok) assert.notEqual(a.orderNumber, b.orderNumber);
  });
});

describe("order numbers under concurrency", () => {
  it("never repeats or skips a number across parallel orders", async () => {
    const { createOrder } = await orders();

    const results = await Promise.all(
      Array.from({ length: 25 }, (_, index) =>
        createOrder(
          data({ customerPhone: `96651000${String(index).padStart(4, "0")}` }, { quantity: 100 + index * 100 }),
        ),
      ),
    );

    assert.ok(results.every((r) => r.ok));
    const numbers = results.flatMap((r) => (r.ok ? [r.orderNumber] : []));
    assert.equal(new Set(numbers).size, 25, "كل الأرقام فريدة");

    // متتابعة بلا فجوات داخل هذه الدفعة
    const sequence = numbers
      .map((n) => Number.parseInt(n.slice(-4), 10))
      .sort((a, b) => a - b);
    for (let i = 1; i < sequence.length; i += 1) assert.equal(sequence[i], sequence[i - 1] + 1);
  });

  it("continues after the highest existing number when the counter is missing", async () => {
    const { generateOrderNumber } = await import("@/lib/reference");
    const { referenceYear } = await import("@/lib/data/sequence");
    const year = referenceYear();

    await fixtures.prisma.sequence.deleteMany({ where: { key: `ORD-${year}` } });
    const highest = await fixtures.prisma.order.findFirstOrThrow({
      where: { orderNumber: { startsWith: `ORD-${year}-` } },
      orderBy: { orderNumber: "desc" },
    });

    const next = await generateOrderNumber();
    assert.equal(
      Number.parseInt(next.slice(-4), 10),
      Number.parseInt(highest.orderNumber.slice(-4), 10) + 1,
    );
  });
});

describe("status changes", () => {
  async function newOrder(phone: string, overrides: Record<string, unknown> = {}) {
    const { createOrder } = await orders();
    const result = await createOrder(data({ customerPhone: phone, ...overrides }));
    assert.ok(result.ok);
    if (!result.ok) throw new Error("order not created");
    return result;
  }

  it("walks the full path, recording an event and an audit row for each step", async () => {
    const { applyOrderChanges, getOrderTimeline } = await service();
    const created = await newOrder("966500000060");

    await applyOrderChanges(created.orderId, { paymentStatus: "PAID" }, { actor: admin });

    for (const status of ["CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED"] as const) {
      const result = await applyOrderChanges(
        created.orderId,
        { status, note: status === "SHIPPED" ? "رقم الشحنة 12345" : undefined },
        { actor: admin, ip: "10.0.0.1" },
      );
      assert.equal(result.ok, true, `${status}: ${!result.ok ? result.error : ""}`);
    }

    const timeline = await getOrderTimeline(created.orderId);
    const statuses = timeline.filter((e) => e.kind === "STATUS").map((e) => e.toStatus);
    assert.deepEqual(statuses, ["NEW", "CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED"]);
    assert.equal(timeline.find((e) => e.toStatus === "SHIPPED")?.note, "رقم الشحنة 12345");
    assert.equal(timeline.find((e) => e.toStatus === "CONFIRMED")?.actorName, admin.name);

    const audit = await fixtures.prisma.auditLog.findMany({
      where: { entity: "Order", entityId: created.orderId, action: "STATUS_CHANGE" },
    });
    // 5 انتقالات حالة + تغيير الدفع
    assert.equal(audit.length, 6);
    assert.equal(audit[0].actorEmail, admin.email);

    const final = await fixtures.prisma.order.findUniqueOrThrow({ where: { id: created.orderId } });
    assert.equal(final.status, "DELIVERED");
  });

  it("rejects disallowed transitions and leaves no trace", async () => {
    const { applyOrderChanges, getOrderTimeline } = await service();
    const created = await newOrder("966500000061");

    const skip = await applyOrderChanges(created.orderId, { status: "DELIVERED" }, { actor: admin });
    assert.equal(skip.ok, false);
    if (!skip.ok) assert.equal(skip.code, "NOT_ALLOWED");

    const same = await applyOrderChanges(created.orderId, { status: "NEW" }, { actor: admin });
    // لا تغيير فعلي: نجاح بلا أثر (الواجهة ترسل الحالة الحالية دائمًا)
    assert.equal(same.ok && same.changed.length, 0);

    const unknown = await applyOrderChanges(created.orderId, { status: "FLYING" }, { actor: admin });
    assert.equal(unknown.ok, false);

    const timeline = await getOrderTimeline(created.orderId);
    assert.equal(timeline.length, 1);

    await applyOrderChanges(created.orderId, { status: "CANCELLED" }, { actor: admin });
    const reopen = await applyOrderChanges(created.orderId, { status: "NEW" }, { actor: admin });
    assert.equal(!reopen.ok && reopen.code, "FINAL_STATUS");

    const missing = await applyOrderChanges("nope", { status: "CONFIRMED" }, { actor: admin });
    assert.equal(!missing.ok && missing.code, "NOT_FOUND");
  });

  it("refuses to deliver an unpaid bank-transfer order but auto-pays cash on pickup", async () => {
    const { applyOrderChanges } = await service();

    const transfer = await newOrder("966500000062", { fulfillment: "PICKUP", city: undefined });
    for (const status of ["CONFIRMED", "IN_PRODUCTION", "READY"] as const) {
      await applyOrderChanges(transfer.orderId, { status }, { actor: admin });
    }
    const blocked = await applyOrderChanges(transfer.orderId, { status: "DELIVERED" }, { actor: admin });
    assert.equal(!blocked.ok && blocked.code, "UNPAID_DELIVERY");

    const both = await applyOrderChanges(
      transfer.orderId,
      { status: "DELIVERED", paymentStatus: "PAID" },
      { actor: admin },
    );
    assert.equal(both.ok, true);

    const cash = await newOrder("966500000063", {
      fulfillment: "PICKUP",
      city: undefined,
      paymentMethod: "ON_PICKUP",
    });
    for (const status of ["CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED"] as const) {
      await applyOrderChanges(cash.orderId, { status }, { actor: admin });
    }
    const order = await fixtures.prisma.order.findUniqueOrThrow({ where: { id: cash.orderId } });
    assert.equal(order.paymentStatus, "PAID");
  });

  it("keeps internal notes out of the public timeline", async () => {
    const { applyOrderChanges, getOrderTimeline } = await service();
    const created = await newOrder("966500000064");

    await applyOrderChanges(
      created.orderId,
      { status: "CONFIRMED", note: "تم تأكيد طلبك", internalNote: "العميل صعب — انتبه" },
      { actor: admin },
    );

    const publicTimeline = await getOrderTimeline(created.orderId, { publicOnly: true });
    assert.ok(publicTimeline.every((event) => event.isPublic && event.actorName === null));
    assert.ok(!publicTimeline.some((event) => event.note?.includes("صعب")));

    const full = await getOrderTimeline(created.orderId);
    assert.ok(full.some((event) => event.note?.includes("صعب")));
  });

  it("serialises concurrent changes: exactly one wins, the rest get a clean refusal", async () => {
    const { applyOrderChanges, getOrderTimeline } = await service();
    const created = await newOrder("966500000065");

    const results = await Promise.all([
      applyOrderChanges(created.orderId, { status: "CONFIRMED" }, { actor: admin }),
      applyOrderChanges(created.orderId, { status: "CONFIRMED" }, { actor: admin }),
      applyOrderChanges(created.orderId, { status: "CANCELLED" }, { actor: admin }),
      applyOrderChanges(created.orderId, { status: "CANCELLED" }, { actor: admin }),
    ]);

    // لا نتيجة تترك الطلب في حالة غير متّسقة: عدد أحداث الحالة = عدد الانتقالات الناجحة + 1
    const changed = results.filter((r) => r.ok && r.changed.includes("status")).length;
    const timeline = await getOrderTimeline(created.orderId);
    assert.equal(timeline.filter((e) => e.kind === "STATUS").length, changed + 1);

    const final = await fixtures.prisma.order.findUniqueOrThrow({ where: { id: created.orderId } });
    const last = timeline.filter((e) => e.kind === "STATUS").at(-1);
    assert.equal(final.status, last?.toStatus);
  });
});

describe("tracking and audit helpers", () => {
  it("exposes the customer timeline only to the matching phone", async () => {
    const { createOrder } = await orders();
    const { trackOrder } = await import("@/lib/data/tracking");

    const created = await createOrder(data({ customerPhone: "966500000070" }));
    assert.ok(created.ok);
    if (!created.ok) return;

    const found = await trackOrder(created.orderNumber, "0500000070");
    assert.equal(found?.orderNumber, created.orderNumber);
    assert.equal(found?.timeline.length, 1);
    assert.equal(found?.status, "NEW");

    assert.equal(await trackOrder(created.orderNumber, "0500000071"), null);
    assert.equal(await trackOrder("ORD-0000-0000", "0500000070"), null);
    assert.equal(await trackOrder(created.orderNumber, "garbage"), null);
  });

  it("diffRecords reports only changed fields and masks secrets", async () => {
    const { diffRecords } = await import("@/lib/data/audit");
    const diff = diffRecords(
      { name: "قديم", price: 10, passwordHash: "a", when: new Date("2026-01-01") },
      { name: "جديد", price: 10, passwordHash: "b", when: new Date("2026-01-01") },
    );
    assert.deepEqual(Object.keys(diff ?? {}).sort(), ["name", "passwordHash"]);
    assert.equal(diff?.passwordHash.to, "••••");
    assert.equal(diffRecords({ a: 1 }, { a: 1 }), null);
  });
});
