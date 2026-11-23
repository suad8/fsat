import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientKey, rateLimit } from "@/lib/rate-limit";

/** مفتاح فريد لكل اختبار حتى لا يتسرّب العدّاد بين الاختبارات (الحالة في ذاكرة الوحدة). */
let n = 0;
const key = () => `test-${++n}`;

describe("rateLimit — نافذة منزلقة", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("يسمح حتى الحد ثم يمنع", () => {
    const k = key();
    const opts = { limit: 3, windowMs: 60_000 };
    expect(rateLimit(k, opts)).toMatchObject({ allowed: true, remaining: 2 });
    expect(rateLimit(k, opts)).toMatchObject({ allowed: true, remaining: 1 });
    expect(rateLimit(k, opts)).toMatchObject({ allowed: true, remaining: 0 });
    const blocked = rateLimit(k, opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("retryAfter بالثواني ويتناقص مع الوقت", () => {
    const k = key();
    const opts = { limit: 1, windowMs: 60_000 };
    rateLimit(k, opts);
    expect(rateLimit(k, opts).retryAfter).toBe(60);
    vi.advanceTimersByTime(20_000);
    expect(rateLimit(k, opts).retryAfter).toBe(40);
  });

  it("retryAfter يُقرَّب للأعلى ولا يكون صفرًا أثناء الحظر", () => {
    const k = key();
    const opts = { limit: 1, windowMs: 1_000 };
    rateLimit(k, opts);
    vi.advanceTimersByTime(999);
    const r = rateLimit(k, opts);
    expect(r.allowed).toBe(false);
    expect(r.retryAfter).toBeGreaterThanOrEqual(1);
  });

  it("تُعاد النافذة بعد انتهائها", () => {
    const k = key();
    const opts = { limit: 1, windowMs: 10_000 };
    rateLimit(k, opts);
    expect(rateLimit(k, opts).allowed).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(rateLimit(k, opts)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("المفاتيح مستقلة (عميل لا يحظر آخر)", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    const a = key();
    const b = key();
    rateLimit(a, opts);
    expect(rateLimit(a, opts).allowed).toBe(false);
    expect(rateLimit(b, opts).allowed).toBe(true);
  });

  it("المحاولات أثناء الحظر لا تمدّد النافذة", () => {
    const k = key();
    const opts = { limit: 1, windowMs: 10_000 };
    rateLimit(k, opts);
    for (let i = 0; i < 50; i++) rateLimit(k, opts);
    vi.advanceTimersByTime(10_000);
    expect(rateLimit(k, opts).allowed).toBe(true);
  });

  it("limit = 1 يسمح بطلب واحد فقط", () => {
    const k = key();
    expect(rateLimit(k, { limit: 1, windowMs: 1000 }).allowed).toBe(true);
    expect(rateLimit(k, { limit: 1, windowMs: 1000 }).allowed).toBe(false);
  });

  it("التنظيف الدوري لا يحذف مفاتيح ما زالت نشطة", () => {
    const k = key();
    const opts = { limit: 2, windowMs: 20 * 60_000 };
    rateLimit(k, opts);
    vi.advanceTimersByTime(6 * 60_000); // يتجاوز SWEEP_INTERVAL
    rateLimit(key(), opts); // يشغّل sweep
    expect(rateLimit(k, opts).remaining).toBe(0); // العدّاد محفوظ (2 → 0)
  });
});

describe("clientKey", () => {
  const req = (headers: Record<string, string>) =>
    new Request("http://localhost/api/x", { headers });

  it("أول عنوان في x-forwarded-for", () => {
    expect(clientKey(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }), "quote")).toBe("quote:1.2.3.4");
  });

  it("يقصّ المسافات", () => {
    expect(clientKey(req({ "x-forwarded-for": "  1.2.3.4  ,x" }), "s")).toBe("s:1.2.3.4");
  });

  it("يرجع إلى x-real-ip ثم unknown", () => {
    expect(clientKey(req({ "x-real-ip": "5.6.7.8" }), "s")).toBe("s:5.6.7.8");
    expect(clientKey(req({}), "s")).toBe("s:unknown");
  });

  it("النطاق (scope) يفصل العدّادات", () => {
    const r = req({ "x-forwarded-for": "1.1.1.1" });
    expect(clientKey(r, "quote")).not.toBe(clientKey(r, "contact"));
  });

  it("[ثغرة معروفة] ترويسة x-forwarded-for قابلة للانتحال تتجاوز الحد", () => {
    // موثّق في rate-limit.ts: بلا وكيل موثوق يعيد كتابة الترويسة، يغيّر المهاجم
    // قيمتها في كل طلب فيحصل على عدّاد جديد. المعالجة من محور الحماية.
    const a = clientKey(req({ "x-forwarded-for": "9.9.9.1" }), "contact");
    const b = clientKey(req({ "x-forwarded-for": "9.9.9.2" }), "contact");
    expect(a).not.toBe(b);
  });
});
