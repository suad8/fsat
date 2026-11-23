import { describe, expect, it } from "vitest";

import { palette } from "@/config/brand";
import {
  contrastRatio,
  generateScale,
  parseHex,
  readableTextOn,
} from "@/lib/theme";
import {
  whatsappGeneralUrl,
  whatsappProductUrl,
  whatsappReferenceUrl,
} from "@/lib/whatsapp";

describe("theme — التباين (يخدم إمكانية الوصول)", () => {
  it("parseHex يقبل 3 و6 خانات ويرفض الباقي", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex("5B33F5")).toEqual({ r: 0x5b, g: 0x33, b: 0xf5 });
    expect(parseHex("#12")).toBeNull();
    expect(parseHex("#gggggg")).toBeNull();
    expect(parseHex("javascript:alert(1)")).toBeNull();
  });

  it("نسبة التباين أبيض/أسود = 21 ومتماثلة", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  /*
   * القيد الرياضي: مع أبيض و#1A1523 فقط، أسوأ تباين ممكن ≈ 4.2 على الألوان
   * المتوسطة (مثل #6666ff). لو كان الداكن #000 لارتفع الحد الأدنى إلى 4.58.
   * ألوان الهوية الحالية فوق 4.5 (الاختبار التالي).
   */
  it("readableTextOn يعطي تباينًا ≥ 4.2 على أي لون (مسح شبكي) وحد WCAG للنص الكبير 3", () => {
    const steps = [0, 51, 102, 153, 204, 255];
    for (const r of steps)
      for (const g of steps)
        for (const b of steps) {
          const bg = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
          const fg = readableTextOn(bg);
          expect(contrastRatio(fg, bg), `${fg} على ${bg}`).toBeGreaterThanOrEqual(4.2);
        }
  });

  it("ألوان الهوية: الذهبي عليه نص داكن مقروء والبنفسجي عليه نص فاتح", () => {
    expect(contrastRatio(readableTextOn(palette.gold), palette.gold)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(readableTextOn(palette.violet), palette.violet)).toBeGreaterThanOrEqual(4.5);
  });

  it("generateScale يعطي 11 درجة (50…950) بصيغة HEX صالحة وبترتيب سطوع تنازلي", () => {
    const scale = generateScale(palette.violet);
    const keys = Object.keys(scale).map(Number).sort((a, b) => a - b);
    expect(keys).toEqual([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
    for (const hex of Object.values(scale)) expect(parseHex(hex)).not.toBeNull();
    const lum = (hex: string) => contrastRatio(hex, "#000000");
    expect(lum(scale[50])).toBeGreaterThan(lum(scale[500]));
    expect(lum(scale[500])).toBeGreaterThan(lum(scale[950]));
  });
});

describe("whatsapp — روابط الرسائل", () => {
  const decode = (url: string) => decodeURIComponent(new URL(url).search.replace(/^\?text=/, ""));

  it("الرابط wa.me برقم أرقام فقط", () => {
    const url = new URL(whatsappGeneralUrl());
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toMatch(/^\/\d+$/);
  });

  it("رسالة المنتج تحوي الاسم والكمية والخيارات والرابط المطلق", () => {
    const text = decode(
      whatsappProductUrl({
        productName: "كوب ورقي",
        productPath: "/shop/cups/paper-cup",
        quantity: 1500,
        size: "8 أونص",
        options: [
          { label: "الطباعة", value: "وجهين" },
          { label: "فارغ", value: "  " },
        ],
        estimatedPrice: "1,200 ر.س",
        notes: "  بسرعة  ",
      }),
    );
    expect(text).toContain("كوب ورقي");
    expect(text).toContain("1,500");
    expect(text).toContain("8 أونص");
    expect(text).toContain("الطباعة: وجهين");
    expect(text).not.toContain("فارغ");
    expect(text).toContain("بسرعة");
    expect(text).toMatch(/https?:\/\/.+\/shop\/cups\/paper-cup/);
  });

  it("رموز خاصة (& # ? %) في اسم المنتج لا تكسر الرابط", () => {
    const name = "علبة A&B #1 100% ?x=y";
    const url = whatsappProductUrl({ productName: name, productPath: "/p" });
    const parsed = new URL(url);
    expect([...parsed.searchParams.keys()]).toEqual(["text"]);
    expect(parsed.searchParams.get("text")).toContain(name);
  });

  it("رسالة المتابعة تذكر الرقم المرجعي", () => {
    expect(decode(whatsappReferenceUrl("ORD-123", "order"))).toContain("ORD-123");
    expect(decode(whatsappReferenceUrl("Q-9", "quote"))).toContain("عرض السعر");
  });
});
