import { describe, expect, it } from "vitest";

import {
  calculatePrice,
  calculateStartingPrice,
  defaultSelection,
  describeSelection,
  findTier,
  normalizeQuantity,
} from "@/lib/pricing";

import { group, product, tier, val } from "./helpers/pricing-fixtures";

/*
 * المبدأ: نكتب كل اختبار كأنه عميل حقيقي (أو مخترق) يحاول أن يحصل على سعر
 * خاطئ. الخطأ في التسعير إما خسارة للمصنع أو فقدان لثقة العميل.
 */

describe("findTier — شرائح الكمية", () => {
  const tiers = [
    tier(100, 499, 5, "١٠٠–٤٩٩"),
    tier(500, 999, 4, "٥٠٠–٩٩٩"),
    tier(1000, null, 3, "١٠٠٠+"),
  ];

  it("يطابق الحدود الدنيا والعليا شاملةً الطرفين", () => {
    expect(findTier(tiers, 100)?.unitPrice).toBe(5);
    expect(findTier(tiers, 499)?.unitPrice).toBe(5);
    expect(findTier(tiers, 500)?.unitPrice).toBe(4);
    expect(findTier(tiers, 999)?.unitPrice).toBe(4);
    expect(findTier(tiers, 1000)?.unitPrice).toBe(3);
  });

  it("الشريحة المفتوحة (maxQty = null) تغطي أي كمية كبيرة", () => {
    expect(findTier(tiers, 5_000_000)?.unitPrice).toBe(3);
  });

  it("كمية أقل من أول شريحة ← لا شريحة (يُستعمل basePrice)", () => {
    expect(findTier(tiers, 99)).toBeNull();
    expect(findTier(tiers, 1)).toBeNull();
  });

  it("لا يعتمد على ترتيب الإدخال", () => {
    const shuffled = [tiers[2], tiers[0], tiers[1]];
    expect(findTier(shuffled, 600)?.unitPrice).toBe(4);
  });

  it("لا يعدّل المصفوفة الأصلية", () => {
    const original = [tiers[2], tiers[0], tiers[1]];
    const copy = [...original];
    findTier(original, 600);
    expect(original).toEqual(copy);
  });

  it("فجوة بين شريحتين ← تبقى الشريحة السابقة سارية حتى تبدأ التالية", () => {
    const gapped = [tier(100, 199, 5), tier(500, null, 3)];
    expect(findTier(gapped, 300)?.unitPrice).toBe(5);
  });

  it("قائمة فارغة ← null", () => {
    expect(findTier([], 10)).toBeNull();
  });
});

describe("normalizeQuantity — الحد الأدنى والخطوة", () => {
  it("يرفع الكمية الأقل من الحد الأدنى إلى الحد الأدنى", () => {
    expect(normalizeQuantity({ minQuantity: 100, quantityStep: 1 }, 5)).toBe(100);
    expect(normalizeQuantity({ minQuantity: 100, quantityStep: 1 }, 0)).toBe(100);
    expect(normalizeQuantity({ minQuantity: 100, quantityStep: 1 }, -50)).toBe(100);
  });

  it("يقصّ الكسور لأسفل", () => {
    expect(normalizeQuantity({ minQuantity: 1, quantityStep: 1 }, 7.9)).toBe(7);
  });

  it("NaN وInfinity ← الحد الأدنى (لا ينهار ولا يعطي NaN)", () => {
    const p = { minQuantity: 50, quantityStep: 10 };
    expect(normalizeQuantity(p, NaN)).toBe(50);
    expect(normalizeQuantity(p, Infinity)).toBe(50);
    expect(normalizeQuantity(p, -Infinity)).toBe(50);
  });

  it("الحد الأدنى أو الخطوة 0 أو سالبة تُعامل كـ 1 (بيانات إدارة فاسدة)", () => {
    expect(normalizeQuantity({ minQuantity: 0, quantityStep: 0 }, 3)).toBe(3);
    expect(normalizeQuantity({ minQuantity: -5, quantityStep: -2 }, 3)).toBe(3);
  });

  it("الخطوة تُحسب ابتداءً من الحد الأدنى لا من الصفر", () => {
    // min=50, step=25 → 50, 75, 100 …
    const p = { minQuantity: 50, quantityStep: 25 };
    expect(normalizeQuantity(p, 75)).toBe(75);
    expect(normalizeQuantity(p, 100)).toBe(100);
    expect(normalizeQuantity(p, 60)).toBe(75); // يُقرَّب للأعلى: لا تقلّ الكمية عمّا طلبه العميل
  });

  it("ناتجه دائمًا ≥ الحد الأدنى ويقع على الشبكة (خاصية على نطاق واسع)", () => {
    const p = { minQuantity: 30, quantityStep: 7 };
    for (let q = -10; q <= 500; q++) {
      const n = normalizeQuantity(p, q);
      expect(n).toBeGreaterThanOrEqual(30);
      expect((n - 30) % 7).toBe(0);
    }
  });

  it("idempotent: تطبيقه مرتين = مرة واحدة", () => {
    const p = { minQuantity: 30, quantityStep: 7 };
    for (let q = 0; q <= 300; q++) {
      const once = normalizeQuantity(p, q);
      expect(normalizeQuantity(p, once)).toBe(once);
    }
  });

  /*
   * خطأ سلوكي: التقريب لأقرب خطوة (Math.round) قد ينقص ما طلبه العميل.
   * عميل يكتب ١٢٠ استيكر لمنتج (حد أدنى ٥٠، خطوة ٥٠) يُسعَّر ويُطبع ١٠٠ فقط
   * بينما يتوقع ≥ ١٢٠. الأسلم Math.ceil. نوثّق السلوك الحالي هنا.
   */
  it("التقريب للأعلى: ١٢٠ مع (حد ٥٠، خطوة ٥٠) تصير ١٥٠ لا ١٠٠", () => {
    const p = { minQuantity: 50, quantityStep: 50 };
    expect(normalizeQuantity(p, 120)).toBe(150);
  });

  it("لا يجوز أن تقلّ الكمية المعتمدة عن المطلوبة (ceil)", () => {
    const p = { minQuantity: 50, quantityStep: 50 };
    expect(normalizeQuantity(p, 120)).toBeGreaterThanOrEqual(120);
  });
});

describe("calculatePrice — الأساسيات", () => {
  it("سعر ثابت × كمية", () => {
    const r = calculatePrice(product({ basePrice: 12.5 }), {}, 4);
    expect(r.unitPrice).toBe(12.5);
    expect(r.quantity).toBe(4);
    expect(r.total).toBe(50);
    expect(r.flatFees).toBe(0);
    expect(r.priceable).toBe(true);
  });

  it("QUOTE_ONLY ← غير قابل للتسعير والإجمالي صفر مهما كانت الخيارات", () => {
    const g = group("size", [val("a", 5, "ADD_PER_UNIT")]);
    const r = calculatePrice(
      product({ priceMode: "QUOTE_ONLY", basePrice: 99, optionGroups: [g] }),
      { size: "a" },
      10,
    );
    expect(r.priceable).toBe(false);
    expect(r.total).toBe(0);
    expect(r.unitPrice).toBe(0);
  });

  it("STARTS_FROM يُسعَّر مثل FIXED عند الحساب", () => {
    const r = calculatePrice(product({ priceMode: "STARTS_FROM", basePrice: 8 }), {}, 3);
    expect(r.total).toBe(24);
  });

  it("الكمية تُطبَّع قبل الحساب (الحد الأدنى)", () => {
    const r = calculatePrice(product({ basePrice: 2, minQuantity: 100 }), {}, 1);
    expect(r.quantity).toBe(100);
    expect(r.total).toBe(200);
  });

  it("سعر أساسي صفر ← إجمالي صفر وليس NaN", () => {
    const r = calculatePrice(product({ basePrice: 0 }), {}, 10);
    expect(r.total).toBe(0);
    expect(Number.isNaN(r.total)).toBe(false);
  });
});

describe("calculatePrice — شرائح الكمية", () => {
  const p = product({
    basePrice: 6,
    minQuantity: 100,
    quantityStep: 100,
    quantityTiers: [
      tier(100, 499, 5, "١٠٠"),
      tier(500, 999, 4, "٥٠٠"),
      tier(1000, null, 3, "١٠٠٠+"),
    ],
  });

  it("يختار الشريحة حسب الكمية بعد التطبيع", () => {
    expect(calculatePrice(p, {}, 100).unitPrice).toBe(5);
    expect(calculatePrice(p, {}, 500).unitPrice).toBe(4);
    expect(calculatePrice(p, {}, 1000).unitPrice).toBe(3);
  });

  it("الكمية التي تُرفع إلى الحد الأدنى تأخذ سعر شريحة الحد الأدنى", () => {
    const r = calculatePrice(p, {}, 7);
    expect(r.quantity).toBe(100);
    expect(r.unitPrice).toBe(5);
    expect(r.tierLabel).toBe("١٠٠");
  });

  it("تُظهر اسم الشريحة في سطر التفصيل الأول", () => {
    const r = calculatePrice(p, {}, 500);
    expect(r.lines[0]).toMatchObject({ label: "٥٠٠", amount: 4, kind: "base" });
  });

  it("الإجمالي يزداد دائمًا مع الكمية (لا توجد شريحة أغلى بالإجمال)", () => {
    // اختبار سلامة بيانات: شريحة أرخص للوحدة يجب ألا تجعل ٥٠٠ أغلى من ٤٩٩
    const flat = product({
      basePrice: 6,
      quantityTiers: [tier(1, 499, 5), tier(500, null, 4)],
    });
    expect(calculatePrice(flat, {}, 500).total).toBeLessThan(
      calculatePrice(flat, {}, 499).total,
    );
    // وهذا السلوك صحيح تجاريًا (خصم كمية) لكن يوثّق أن الإجمالي غير رتيب
  });

  it("المنتج بلا شرائح يستعمل basePrice", () => {
    expect(calculatePrice(product({ basePrice: 9 }), {}, 1000).unitPrice).toBe(9);
  });
});

describe("calculatePrice — معدّلات الخيارات", () => {
  it("ADD_PER_UNIT يُضاف لكل وحدة", () => {
    const g = group("finish", [val("matte", 0.5, "ADD_PER_UNIT")]);
    const r = calculatePrice(product({ basePrice: 10, optionGroups: [g] }), { finish: "matte" }, 10);
    expect(r.unitPrice).toBe(10.5);
    expect(r.total).toBe(105);
  });

  it("ADD رسم ثابت للطلب لا يتضاعف بالكمية", () => {
    const g = group("setup", [val("die", 150, "ADD")]);
    const r10 = calculatePrice(product({ basePrice: 10, optionGroups: [g] }), { setup: "die" }, 10);
    const r1000 = calculatePrice(product({ basePrice: 10, optionGroups: [g] }), { setup: "die" }, 1000);
    expect(r10.flatFees).toBe(150);
    expect(r10.total).toBe(250);
    expect(r1000.total).toBe(10_150);
  });

  it("MULTIPLY يضرب سعر الوحدة بعد الإضافات (الترتيب موثّق)", () => {
    const sizes = group("size", [val("big", 1.5, "MULTIPLY")]);
    const finish = group("finish", [val("matte", 2, "ADD_PER_UNIT")]);
    const r = calculatePrice(
      product({ basePrice: 10, optionGroups: [sizes, finish] }),
      { size: "big", finish: "matte" },
      1,
    );
    // (10 + 2) × 1.5 = 18 وليس 10×1.5 + 2 = 17
    expect(r.unitPrice).toBe(18);
  });

  it("ترتيب المجموعات في المصفوفة لا يغيّر الناتج", () => {
    const sizes = group("size", [val("big", 1.5, "MULTIPLY")]);
    const finish = group("finish", [val("matte", 2, "ADD_PER_UNIT")]);
    const a = calculatePrice(
      product({ basePrice: 10, optionGroups: [sizes, finish] }),
      { size: "big", finish: "matte" },
      3,
    );
    const b = calculatePrice(
      product({ basePrice: 10, optionGroups: [finish, sizes] }),
      { size: "big", finish: "matte" },
      3,
    );
    expect(a.total).toBe(b.total);
  });

  it("المضاعِفات تتراكم (1.2 × 1.5)", () => {
    const a = group("a", [val("x", 1.2, "MULTIPLY")]);
    const b = group("b", [val("y", 1.5, "MULTIPLY")]);
    const r = calculatePrice(product({ basePrice: 10, optionGroups: [a, b] }), { a: "x", b: "y" }, 1);
    expect(r.unitPrice).toBe(18);
  });

  it("المضاعِف الصفري أو السالب يُتجاهل (لا ينتج سعر صفر عن طريق الخطأ)", () => {
    const g = group("a", [val("zero", 0, "MULTIPLY"), val("neg", -2, "MULTIPLY")]);
    const p = product({ basePrice: 10, optionGroups: [g] });
    expect(calculatePrice(p, { a: "zero" }, 1).unitPrice).toBe(10);
    expect(calculatePrice(p, { a: "neg" }, 1).unitPrice).toBe(10);
  });

  it("OVERRIDE_UNIT يستبدل السعر الأساسي وسعر الشريحة", () => {
    const g = group("material", [val("gold", 25, "OVERRIDE_UNIT")]);
    const r = calculatePrice(
      product({ basePrice: 10, optionGroups: [g], quantityTiers: [tier(1, null, 8, "شريحة")] }),
      { material: "gold" },
      2,
    );
    expect(r.unitPrice).toBe(25);
    expect(r.total).toBe(50);
    // سطر الشريحة القديم يُستبدل بسطر الاستبدال
    expect(r.lines[0].label).toContain("قيمة gold");
  });

  it("OVERRIDE ثم ADD_PER_UNIT ثم MULTIPLY بالترتيب الموثّق", () => {
    const m = group("m", [val("o", 20, "OVERRIDE_UNIT")]);
    const f = group("f", [val("a", 5, "ADD_PER_UNIT")]);
    const s = group("s", [val("x", 2, "MULTIPLY")]);
    const r = calculatePrice(
      product({ basePrice: 1, optionGroups: [s, f, m] }),
      { m: "o", f: "a", s: "x" },
      1,
    );
    expect(r.unitPrice).toBe(50); // (20 + 5) × 2
  });

  it("خيار CHECKBOX متعدد القيم تُجمع إضافاته", () => {
    const g = group(
      "extras",
      [val("a", 1, "ADD_PER_UNIT"), val("b", 2, "ADD_PER_UNIT"), val("c", 4, "ADD_PER_UNIT")],
      { type: "CHECKBOX" },
    );
    const r = calculatePrice(product({ basePrice: 10, optionGroups: [g] }), { extras: ["a", "c"] }, 1);
    expect(r.unitPrice).toBe(15);
  });

  it("القيمة غير الفعّالة (isActive=false) لا تؤثر على السعر", () => {
    const g = group("a", [val("x", 100, "ADD_PER_UNIT", { isActive: false })]);
    const r = calculatePrice(product({ basePrice: 10, optionGroups: [g] }), { a: "x" }, 1);
    expect(r.unitPrice).toBe(10);
  });

  it("معرّف قيمة غير موجود ← يُتجاهل بصمت ولا يغيّر السعر", () => {
    const g = group("a", [val("x", 100, "ADD_PER_UNIT")]);
    const r = calculatePrice(product({ basePrice: 10, optionGroups: [g] }), { a: "nope" }, 1);
    expect(r.unitPrice).toBe(10);
  });

  it("المعدّل السالب يخفض السعر لكن لا ينزل بالإجمالي دون صفر", () => {
    const g = group("promo", [val("p", -50, "ADD_PER_UNIT")]);
    const r = calculatePrice(product({ basePrice: 10, optionGroups: [g] }), { promo: "p" }, 5);
    expect(r.unitPrice).toBe(0);
    expect(r.total).toBe(0);
  });

  it("الرسم الثابت السالب لا يُنتج إجمالي سالبًا", () => {
    const g = group("promo", [val("p", -1000, "ADD")]);
    const r = calculatePrice(product({ basePrice: 10, optionGroups: [g] }), { promo: "p" }, 1);
    expect(r.flatFees).toBe(0);
    expect(r.total).toBe(10);
  });

  it("الحقول الحرّة (TEXT/NUMBER/FILE) لا تؤثر على السعر حتى لو كان اسمها يطابق قيمة", () => {
    const g = group("note", [val("x", 100, "ADD_PER_UNIT")], { type: "TEXT" });
    const r = calculatePrice(product({ basePrice: 10, optionGroups: [g] }), { note: "x" }, 1);
    expect(r.unitPrice).toBe(10);
  });
});

describe("calculatePrice — الدقة العشرية", () => {
  it("لا تظهر أخطاء الفاصلة العائمة (0.1 + 0.2)", () => {
    const g = group("a", [val("x", 0.2, "ADD_PER_UNIT")]);
    const r = calculatePrice(product({ basePrice: 0.1, optionGroups: [g] }), { a: "x" }, 1);
    expect(r.unitPrice).toBe(0.3);
    expect(r.total).toBe(0.3);
  });

  it("الإجمالي دائمًا بمنزلتين عشريتين كحد أقصى", () => {
    const g = group("a", [val("x", 1.07, "MULTIPLY")]);
    for (const basePrice of [3.33, 7.77, 19.99, 0.01, 123.456]) {
      for (const qty of [1, 3, 7, 33, 101, 999]) {
        const r = calculatePrice(product({ basePrice, optionGroups: [g] }), { a: "x" }, qty);
        expect(Math.round(r.total * 100)).toBeCloseTo(r.total * 100, 6);
        expect(Math.round(r.unitPrice * 100)).toBeCloseTo(r.unitPrice * 100, 6);
      }
    }
  });

  it("[سلوك موثّق] سعر الوحدة يُقرَّب قبل الضرب بالكمية", () => {
    // 3.333 → 3.33؛ ×10000 = 33300 وليس 33330
    const r = calculatePrice(product({ basePrice: 3.333 }), {}, 10_000);
    expect(r.unitPrice).toBe(3.33);
    expect(r.total).toBe(33_300);
  });

  it("كميات ضخمة لا تنتج Infinity", () => {
    const r = calculatePrice(product({ basePrice: 999.99 }), {}, 1e9);
    expect(Number.isFinite(r.total)).toBe(true);
  });
});

describe("calculatePrice — الخيارات الإلزامية", () => {
  const required = group("size", [val("a", 0, "ADD_PER_UNIT")], { isRequired: true });

  it("يُبلغ عن المجموعة الإلزامية غير المختارة", () => {
    const r = calculatePrice(product({ optionGroups: [required] }), {}, 1);
    expect(r.missingRequired).toEqual(["size"]);
  });

  it("يُبلغ حتى لمنتج QUOTE_ONLY", () => {
    const r = calculatePrice(product({ priceMode: "QUOTE_ONLY", optionGroups: [required] }), {}, 1);
    expect(r.missingRequired).toEqual(["size"]);
  });

  it("مجموعة إلزامية كل قيمها معطّلة لا تُحسب ناقصة (لا يُحبس العميل أمام خيار لا يمكنه اختياره)", () => {
    const g = group("size", [val("a", 0, "ADD_PER_UNIT", { isActive: false })], { isRequired: true });
    const r = calculatePrice(product({ optionGroups: [g] }), { size: "a" }, 1);
    expect(r.missingRequired).toEqual([]);
  });

  it("مصفوفة فارغة لـ CHECKBOX إلزامي ← ناقص", () => {
    const g = group("extras", [val("a", 1, "ADD_PER_UNIT")], { type: "CHECKBOX", isRequired: true });
    expect(calculatePrice(product({ optionGroups: [g] }), { extras: [] }, 1).missingRequired).toEqual([
      "extras",
    ]);
  });

  it("الحقل النصي الإلزامي الفارغ يُحسب ناقصًا (التحقق على الخادم)", () => {
    const g = group("name", [], { type: "TEXT", isRequired: true });
    expect(calculatePrice(product({ optionGroups: [g] }), {}, 1).missingRequired).toEqual(["name"]);
  });
});

describe("calculatePrice — التلاعب بالخيارات من المتصفّح", () => {
  /*
   * الخادم يعيد حساب السعر من selection يأتي من العميل (orders.ts). إن سمحت
   * calculatePrice بأكثر من قيمة في مجموعة اختيار واحد، يستطيع المشتري إرسال
   * مصفوفة بمعرّفي خصم فيُطبَّقان معًا.
   */
  it("مجموعة RADIO لا تقبل أكثر من قيمة (لا تراكم خصومات بالتلاعب)", () => {
    const g = group("size", [val("a", 0.5, "MULTIPLY"), val("b", 0.5, "MULTIPLY")], {
      type: "RADIO",
    });
    const r = calculatePrice(
      product({ basePrice: 100, optionGroups: [g] }),
      { size: ["a", "b"] },
      1,
    );
    expect(r.unitPrice).toBe(50); // قيمة واحدة فقط، لا 25
  });

  it("مجموعة SELECT لا تقبل جمع إضافات سالبة متعددة", () => {
    const g = group(
      "promo",
      [val("a", -3, "ADD_PER_UNIT"), val("b", -3, "ADD_PER_UNIT")],
      { type: "SELECT" },
    );
    const r = calculatePrice(
      product({ basePrice: 10, optionGroups: [g] }),
      { promo: ["a", "b"] },
      1,
    );
    expect(r.unitPrice).toBe(7);
  });

  it("تكرار المعرّف نفسه في مصفوفة CHECKBOX لا يضاعف الأثر", () => {
    const g = group("extras", [val("a", 2, "ADD_PER_UNIT")], { type: "CHECKBOX" });
    const r = calculatePrice(
      product({ basePrice: 10, optionGroups: [g] }),
      { extras: ["a", "a", "a"] },
      1,
    );
    expect(r.unitPrice).toBe(12);
  });
});

describe("calculateStartingPrice — «يبدأ من»", () => {
  it("QUOTE_ONLY ← null", () => {
    expect(calculateStartingPrice(product({ priceMode: "QUOTE_ONLY" }))).toBeNull();
  });

  it("يأخذ أرخص قيمة في كل مجموعة إلزامية فقط", () => {
    const size = group(
      "size",
      [val("s", 0, "ADD_PER_UNIT"), val("l", 3, "ADD_PER_UNIT")],
      { isRequired: true },
    );
    const extra = group("extra", [val("x", 9, "ADD_PER_UNIT")]); // اختيارية
    expect(
      calculateStartingPrice(product({ basePrice: 10, optionGroups: [size, extra] })),
    ).toBe(10);
  });

  it("يحسب عند الحد الأدنى للكمية (شريحة الحد الأدنى)", () => {
    const p = product({
      basePrice: 9,
      minQuantity: 100,
      quantityTiers: [tier(100, 499, 5), tier(500, null, 3)],
    });
    expect(calculateStartingPrice(p)).toBe(5);
  });

  it("لا يتجاوز أبدًا أرخص سعر فعلي ممكن (خاصية بالقوة الغاشمة، ADD_PER_UNIT فقط)", () => {
    const g1 = group("a", [val("a1", 4, "ADD_PER_UNIT"), val("a2", 1, "ADD_PER_UNIT")], { isRequired: true });
    const g2 = group("b", [val("b1", 2, "ADD_PER_UNIT"), val("b2", 7, "ADD_PER_UNIT")], { isRequired: true });
    const p = product({ basePrice: 10, optionGroups: [g1, g2] });
    const start = calculateStartingPrice(p)!;
    let min = Infinity;
    for (const a of ["a1", "a2"])
      for (const b of ["b1", "b2"]) min = Math.min(min, calculatePrice(p, { a, b }, 1).unitPrice);
    expect(start).toBe(min);
  });

  /*
   * خطأ حقيقي: effectiveCost يقارن ADD_PER_UNIT بـ MULTIPLY بتحويل اعتباطي
   * ((m − 1) × 100)، فلا يختار الأرخص فعلاً. العميل يرى «يبدأ من ١٢» بينما
   * أرخص خيار يعطي ٣.
   */
  it("«يبدأ من» يختار أرخص مزيج حين تختلط ADD_PER_UNIT وMULTIPLY", () => {
    const g = group(
      "finish",
      [val("add", 10, "ADD_PER_UNIT"), val("mul", 1.5, "MULTIPLY")],
      { isRequired: true },
    );
    const p = product({ basePrice: 2, optionGroups: [g] });
    const actualMin = Math.min(
      calculatePrice(p, { finish: "add" }, 1).unitPrice, // 12
      calculatePrice(p, { finish: "mul" }, 1).unitPrice, // 3
    );
    expect(calculateStartingPrice(p)).toBe(actualMin);
  });

  it("«يبدأ من» يراعي أن OVERRIDE_UNIT قد يكون أرخص من الإضافة الصفرية", () => {
    const g = group(
      "material",
      [val("std", 0, "ADD_PER_UNIT"), val("eco", 5, "OVERRIDE_UNIT")],
      { isRequired: true },
    );
    const p = product({ basePrice: 10, optionGroups: [g] });
    // الأرخص فعلاً: eco = 5
    expect(calculateStartingPrice(p)).toBe(5);
  });
});

describe("defaultSelection", () => {
  it("المجموعة الإلزامية تأخذ الافتراضي ثم أول قيمة فعّالة", () => {
    const withDefault = group("a", [val("a1", 0, "ADD"), val("a2", 0, "ADD", { isDefault: true })], {
      isRequired: true,
    });
    const noDefault = group("b", [val("b1", 0, "ADD"), val("b2", 0, "ADD")], { isRequired: true });
    expect(defaultSelection([withDefault, noDefault])).toEqual({ a: "a2", b: "b1" });
  });

  it("الاختيارية بلا افتراضي تبقى فارغة", () => {
    const g = group("opt", [val("x", 0, "ADD")]);
    expect(defaultSelection([g])).toEqual({});
  });

  it("CHECKBOX يأخذ كل الافتراضيات فقط", () => {
    const g = group(
      "ex",
      [val("a", 0, "ADD", { isDefault: true }), val("b", 0, "ADD"), val("c", 0, "ADD", { isDefault: true })],
      { type: "CHECKBOX" },
    );
    expect(defaultSelection([g])).toEqual({ ex: ["a", "c"] });
  });

  it("يتخطّى القيم غير الفعّالة والمجموعات بلا قيم فعّالة", () => {
    const g = group("a", [val("a1", 0, "ADD", { isActive: false })], { isRequired: true });
    const t = group("t", [], { type: "TEXT", isRequired: true });
    expect(defaultSelection([g, t])).toEqual({});
  });

  it("السعر الافتراضي المعروض لا يترك مجموعة إلزامية ناقصة", () => {
    const g = group("a", [val("a1", 1, "ADD_PER_UNIT")], { isRequired: true });
    const p = product({ optionGroups: [g] });
    expect(calculatePrice(p, defaultSelection(p.optionGroups), 1).missingRequired).toEqual([]);
  });
});

describe("describeSelection", () => {
  it("يصف القيم المختارة ويتجاهل غير المختارة", () => {
    const g = group("size", [val("a", 0, "ADD"), val("b", 0, "ADD")]);
    expect(describeSelection([g], { size: "b" })).toEqual([
      { key: "size", label: "مجموعة size", value: "b", valueLabel: "قيمة b" },
    ]);
    expect(describeSelection([g], {})).toEqual([]);
  });

  it("CHECKBOX يدمج القيم بفاصلة عربية", () => {
    const g = group("ex", [val("a", 0, "ADD"), val("b", 0, "ADD")], { type: "CHECKBOX" });
    expect(describeSelection([g], { ex: ["a", "b"] })[0].valueLabel).toBe("قيمة a، قيمة b");
  });

  it("الحقول الحرّة تُقصّ مسافاتها وتُهمل إن كانت فارغة", () => {
    const t = group("txt", [], { type: "TEXT" });
    expect(describeSelection([t], { txt: "  اسم الشركة  " })[0].value).toBe("اسم الشركة");
    expect(describeSelection([t], { txt: "   " })).toEqual([]);
  });
});
