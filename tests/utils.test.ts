import { describe, expect, it } from "vitest";

import {
  absoluteUrl,
  calcVat,
  decodeSlug,
  formatDate,
  formatDateTime,
  formatFileSize,
  formatNumber,
  formatPrice,
  formatPriceWithCurrency,
  round2,
  slugify,
  truncate,
  yearsOfExperience,
} from "@/lib/utils";

/** يزيل علامات الاتجاه غير المرئية (LRM/RLM) التي يضيفها Intl للعربية. */
const plain = (s: string) => s.replace(/[‎‏؜]/g, "");

describe("formatPrice", () => {
  it("لا كسور للأعداد الصحيحة", () => {
    expect(formatPrice(0)).toBe("0");
    expect(formatPrice(5)).toBe("5");
    expect(formatPrice(100)).toBe("100");
  });

  it("منزلتان عشريتان كاملتان عند وجود كسر (5.5 ← 5.50) — لا يظهر السعر مبتورًا", () => {
    expect(formatPrice(5.5)).toBe("5.50");
    expect(formatPrice(1234.5)).toBe("1,234.50");
  });

  it("أرقام لاتينية وفاصل آلاف (لا أرقام عربية شرقية في الأسعار)", () => {
    expect(formatPrice(1_000_000)).toBe("1,000,000");
    expect(formatPrice(1234.56)).not.toMatch(/[٠-٩]/);
  });

  it("خطأ الفاصلة العائمة لا يظهر (0.1+0.2)", () => {
    expect(formatPrice(0.1 + 0.2)).toBe("0.30");
  });

  it("التقريب لا ينتج «100.00» غير متسق: 99.999 ← 100", () => {
    expect(formatPrice(99.999)).toBe("100");
  });

  it("الرمز بعد الرقم مع مسافة", () => {
    expect(formatPriceWithCurrency(10)).toBe("10 ر.س");
  });

  it("السالب يحمل علامة اتجاه غير مرئية (موثّق) لكن النص المرئي صحيح", () => {
    expect(plain(formatPrice(-5))).toBe("-5");
  });
});

describe("formatNumber", () => {
  it("أرقام لاتينية بفواصل", () => {
    expect(formatNumber(1_500)).toBe("1,500");
    expect(formatNumber(0)).toBe("0");
  });
});

describe("التاريخ والوقت — المنطقة الزمنية", () => {
  /*
   * الخادم على Railway بتوقيت UTC. طلب أُنشئ ١:٣٠ ليلاً بتوقيت الرياض
   * (22:30 UTC اليوم السابق) يجب أن يظهر بتاريخ الرياض لا بتاريخ UTC.
   */
  it("formatDate يستعمل تاريخ الرياض لا تاريخ UTC", () => {
    const out = formatDate("2026-03-15T22:30:00Z"); // الرياض: 16 مارس 01:30
    expect(out).toContain("16");
    expect(out).toContain("مارس");
    expect(out).toContain("2026");
  });

  it("formatDateTime يستعمل ساعة الرياض (UTC+3)", () => {
    const out = plain(formatDateTime("2026-03-15T12:00:00Z")); // 15:00 الرياض
    expect(out).toMatch(/3:00/);
    expect(out).toContain("م");
  });

  it("تاريخ ميلادي لا هجري", () => {
    expect(formatDate("2026-06-01T09:00:00Z")).toContain("2026");
  });

  it("يقبل Date وسلسلة ISO بنفس النتيجة", () => {
    const iso = "2026-01-02T10:00:00Z";
    expect(formatDate(iso)).toBe(formatDate(new Date(iso)));
  });
});

describe("slugify", () => {
  it("يُبقي العربية ويستبدل المسافات بشرطة", () => {
    expect(slugify("كروت شخصية")).toBe("كروت-شخصية");
  });

  it("الإنجليزية بأحرف صغيرة", () => {
    expect(slugify("  Hello World! ")).toBe("hello-world");
  });

  it("يزيل التشكيل", () => {
    expect(slugify("بَاب")).toBe("باب");
  });

  it("يُبقي الأرقام العربية الشرقية واللاتينية", () => {
    expect(slugify("منتج ٥٠٠ حبة")).toBe("منتج-٥٠٠-حبة");
    expect(slugify("Box 500")).toBe("box-500");
  });

  it("يطوي الفواصل المتتالية ويقصّ أطراف الشرطات", () => {
    expect(slugify("--a--b--")).toBe("a-b");
    expect(slugify("A/B & C")).toBe("a-b-c");
    expect(slugify("كوب (٨ أونص)")).toBe("كوب-٨-أونص");
  });

  it("لا يتجاوز ٩٦ حرفًا", () => {
    expect(slugify("a".repeat(300)).length).toBe(96);
  });

  it("[حد] نص بلا حروف/أرقام ← سلسلة فارغة (على المحرّرات التعامل معها)", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("idempotent: slugify(slugify(x)) = slugify(x)", () => {
    for (const s of ["كروت شخصية", "Hello  World", "A/B & C", "منتج ٥٠٠"]) {
      expect(slugify(slugify(s))).toBe(slugify(s));
    }
  });

  it("لا يترك حروفًا خاصة بالروابط (?#/%)", () => {
    expect(slugify("a?b#c/d%e")).toMatch(/^[\p{L}\p{N}-]+$/u);
  });

  it("القصّ عند ٩٦ لا يترك شرطة في النهاية", () => {
    const s = `${"a".repeat(95)} b`; // الفاصل عند الموضع ٩٦
    expect(slugify(s).endsWith("-")).toBe(false);
  });
});

describe("decodeSlug", () => {
  it("يفكّ الترميز المئوي للعربية", () => {
    const encoded = encodeURIComponent("كروت-شخصية");
    expect(decodeSlug(encoded)).toBe("كروت-شخصية");
  });

  it("نص عادي يمرّ كما هو", () => {
    expect(decodeSlug("business-cards")).toBe("business-cards");
  });

  it("ترميز مبتور أو فاسد لا يرمي استثناءً (كان سيعطي 500)", () => {
    expect(() => decodeSlug("%E0%A4%A")).not.toThrow();
    expect(decodeSlug("%E0%A4%A")).toBe("%E0%A4%A");
    expect(decodeSlug("%")).toBe("%");
  });

  it("round-trip مع slugify", () => {
    const slug = slugify("بوكسات تغليف فاخرة");
    expect(decodeSlug(encodeURIComponent(slug))).toBe(slug);
  });
});

describe("round2 و calcVat", () => {
  it("round2 يتجنّب أخطاء العائمة", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(2.675)).toBe(2.68);
  });

  it("الأسعار شاملة الضريبة (الإعداد الحالي): 115 ← صافي 100 وضريبة 15", () => {
    expect(calcVat(115)).toEqual({ net: 100, vat: 15, gross: 115 });
  });

  it("صافي + ضريبة = الإجمالي دائمًا لكل مبلغ من 0.01 إلى 1000.00 (فاتورة لا تختلّ بهللة)", () => {
    for (let cents = 1; cents <= 100_000; cents++) {
      const amount = cents / 100;
      const r = calcVat(amount);
      expect(round2(r.net + r.vat)).toBe(r.gross);
    }
  });

  it("صفر ← أصفار", () => {
    expect(calcVat(0)).toEqual({ net: 0, vat: 0, gross: 0 });
  });
});

describe("truncate و formatFileSize و absoluteUrl و yearsOfExperience", () => {
  it("truncate يطوي المسافات المتعددة ويضيف …", () => {
    expect(truncate("  a   b  c ", 50)).toBe("a b c");
    expect(truncate("abcdefghij", 5)).toBe("abcd…");
    expect(truncate("abc", 3)).toBe("abc");
  });

  it("truncate لا يتجاوز الحد", () => {
    expect(truncate("كلمة ".repeat(100), 40).length).toBeLessThanOrEqual(40);
  });

  it("formatFileSize", () => {
    expect(formatFileSize(500)).toBe("500 بايت");
    expect(formatFileSize(2048)).toBe("2 كيلوبايت");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 ميجابايت");
  });

  it("absoluteUrl يضيف / ناقصة ولا يكرّرها", () => {
    expect(absoluteUrl("/a")).toBe(absoluteUrl("a"));
    expect(absoluteUrl("/a")).not.toContain("//a");
  });

  it("yearsOfExperience لا ينزل عن سنة", () => {
    expect(yearsOfExperience(new Date().getFullYear())).toBe(1);
    expect(yearsOfExperience(new Date().getFullYear() + 5)).toBe(1);
    expect(yearsOfExperience(2000)).toBeGreaterThanOrEqual(25);
  });
});
