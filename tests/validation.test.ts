import { describe, expect, it } from "vitest";

import {
  checkoutSchema,
  contactMessageSchema,
  fieldErrors,
  loginSchema,
  quoteRequestSchema,
  saudiPhone,
} from "@/lib/validation";

const parsePhone = (v: string) => saudiPhone.safeParse(v);

describe("saudiPhone", () => {
  it.each([
    "0512345678",
    "512345678",
    "+966512345678",
    "00966512345678",
    "966512345678",
    "05 1234-5678",
    "(051) 234 5678",
    "  0512345678  ",
  ])("يقبل الصيغة %j ويوحّدها إلى 966512345678", (input) => {
    const r = parsePhone(input);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("966512345678");
  });

  it.each([
    ["أرقام عربية شرقية", "٠٥١٢٣٤٥٦٧٨"],
    ["أرقام فارسية", "۰۵۱۲۳۴۵۶۷۸"],
    ["مختلطة مع +٩٦٦", "+٩٦٦٥١٢٣٤٥٦٧٨"],
  ])("يقبل %s (لوحة المفاتيح العربية)", (_label, input) => {
    const r = parsePhone(input);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("966512345678");
  });

  it.each([
    ["فارغ", ""],
    ["مسافات فقط", "   "],
    ["ثابت وليس جوالًا (يبدأ 4)", "0412345678"],
    ["أقل من ٩ خانات", "051234567"],
    ["أكثر من ٩ خانات", "05123456789"],
    ["صفر زائد بعد المقدمة", "+9660512345678"],
    ["حروف", "05abcdefgh"],
    ["رقم دولة آخر", "+971512345678"],
    ["حقن نص", "0512345678; DROP TABLE"],
  ])("يرفض %s", (_label, input) => {
    expect(parsePhone(input).success).toBe(false);
  });

  it("الناتج دائمًا 12 خانة تبدأ بـ 9665", () => {
    for (const input of ["0500000000", "0599999999", "+966555555555"]) {
      const r = parsePhone(input);
      expect(r.success && /^9665\d{8}$/.test(r.data)).toBe(true);
    }
  });
});

const validQuote = {
  customerName: "محمد العتيبي",
  phone: "0512345678",
  city: "الرياض",
  productType: "كروت شخصية",
  description: "أحتاج ٥٠٠ كرت بوجهين على ورق مطفي",
  acceptTerms: "on",
};

describe("quoteRequestSchema", () => {
  it("طلب صحيح بالحد الأدنى من الحقول", () => {
    const r = quoteRequestSchema.safeParse(validQuote);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.phone).toBe("966512345678");
      expect(r.data.preferredContact).toBe("WHATSAPP");
    }
  });

  it("الحقول الاختيارية الفارغة ('') لا تصل كقيمة صالحة للاستعمال (falsy)", () => {
    const r = quoteRequestSchema.safeParse({
      ...validQuote,
      email: "",
      companyName: "",
      size: "",
      quantity: "",
      dueDate: "",
      productSlug: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      // البريد يتحوّل فعلًا إلى undefined (فشل .email() فانتقل إلى literal(""))
      expect(r.data.email).toBeUndefined();
      // ملاحظة: بقية الحقول تبقى "" لأن z.string() يقبل الفارغ قبل الوصول إلى
      // .or(literal("")) — فيخزَّن "" بدل null. لا يضرّ لأن الكود يفحص truthiness،
      // لكنه تنظيف مؤجَّل لمحور البيانات (انظر docs/QA.md).
      expect(r.data.companyName).toBeFalsy();
      expect(r.data.dueDate).toBeFalsy();
    }
  });

  it.each([
    ["اسم قصير", { customerName: "م" }, "customerName"],
    ["اسم طويل", { customerName: "م".repeat(81) }, "customerName"],
    ["وصف قصير", { description: "قصير" }, "description"],
    ["وصف طويل", { description: "م".repeat(2001) }, "description"],
    ["بريد خاطئ", { email: "not-an-email" }, "email"],
    ["تاريخ خاطئ", { dueDate: "غداً" }, "dueDate"],
    ["جوال خاطئ", { phone: "123" }, "phone"],
    ["بلا موافقة", { acceptTerms: false }, "acceptTerms"],
    ["موافقة نصية خاطئة", { acceptTerms: "no" }, "acceptTerms"],
    ["اتصال مفضّل غير معروف", { preferredContact: "FAX" }, "preferredContact"],
  ])("يرفض: %s", (_label, patch, field) => {
    const r = quoteRequestSchema.safeParse({ ...validQuote, ...patch });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(fieldErrors(r.error))).toContain(field);
  });

  it("الاسم يُقصّ قبل الفحص: مسافات فقط ← مرفوض", () => {
    expect(quoteRequestSchema.safeParse({ ...validQuote, customerName: "     " }).success).toBe(false);
  });

  it("الـ honeypot المملوء يُرفض (إرسال آلي)", () => {
    expect(quoteRequestSchema.safeParse({ ...validQuote, website: "http://spam.example" }).success).toBe(false);
    expect(quoteRequestSchema.safeParse({ ...validQuote, website: "" }).success).toBe(true);
  });

  it("acceptTerms يقبل true وtrue النصي وon", () => {
    for (const v of [true, "true", "on"]) {
      expect(quoteRequestSchema.safeParse({ ...validQuote, acceptTerms: v }).success).toBe(true);
    }
  });

  it("أكثر من ١٠ مرفقات مرفوض", () => {
    const att = { name: "a.png", url: "/uploads/quotes/ab12-0123456789abcdef.png", size: 10, mimeType: "image/png" };
    expect(
      quoteRequestSchema.safeParse({ ...validQuote, attachments: Array(11).fill(att) }).success,
    ).toBe(false);
    expect(
      quoteRequestSchema.safeParse({ ...validQuote, attachments: Array(10).fill(att) }).success,
    ).toBe(true);
  });

  it("رابط مرفق خارجي أو javascript: مرفوض (منع تصيّد/XSS في لوحة الإدارة)", () => {
    for (const url of ["https://evil.example/x.png", "javascript:alert(1)", "//evil.example/a.png"]) {
      const att = { name: "a.png", url, size: 10, mimeType: "image/png" };
      expect(
        quoteRequestSchema.safeParse({ ...validQuote, attachments: [att] }).success,
      ).toBe(false);
    }
  });

  it("حجم مرفق سالب مرفوض", () => {
    const att = { name: "a.png", url: "/uploads/a.png", size: -1, mimeType: "image/png" };
    expect(quoteRequestSchema.safeParse({ ...validQuote, attachments: [att] }).success).toBe(false);
  });

  it("حقول إضافية غير معروفة تُهمل ولا تصل للناتج (لا تلويث)", () => {
    const r = quoteRequestSchema.safeParse({ ...validQuote, isAdmin: true, status: "WON" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty("isAdmin");
      expect(r.data).not.toHaveProperty("status");
    }
  });
});

describe("contactMessageSchema", () => {
  const valid = { name: "سارة", phone: "0512345678", message: "أريد الاستفسار عن الأسعار" };

  it("رسالة صحيحة", () => {
    expect(contactMessageSchema.safeParse(valid).success).toBe(true);
  });

  it("رسالة قصيرة أو طويلة مرفوضة", () => {
    expect(contactMessageSchema.safeParse({ ...valid, message: "مرحبا" }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...valid, message: "م".repeat(2001) }).success).toBe(false);
  });

  it("الـ honeypot", () => {
    expect(contactMessageSchema.safeParse({ ...valid, website: "x" }).success).toBe(false);
  });
});

const validCheckout = {
  customerName: "خالد",
  customerPhone: "0555555555",
  fulfillment: "PICKUP",
  paymentMethod: "BANK_TRANSFER",
  items: [{ productId: "p1", quantity: 100, selection: { size: "a", extras: ["x", "y"] } }],
  acceptTerms: true,
};

describe("checkoutSchema", () => {
  it("طلب استلام من الفرع صحيح بلا عنوان", () => {
    expect(checkoutSchema.safeParse(validCheckout).success).toBe(true);
  });

  it("التوصيل يتطلب مدينة وعنوانًا", () => {
    const r = checkoutSchema.safeParse({ ...validCheckout, fulfillment: "DELIVERY" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = fieldErrors(r.error);
      expect(errs.city).toBeTruthy();
    }
  });

  it("التوصيل مع مدينة وعنوان ← مقبول", () => {
    const r = checkoutSchema.safeParse({
      ...validCheckout,
      fulfillment: "DELIVERY",
      city: "جدة",
      addressLine: "حي الروضة، شارع 5",
    });
    expect(r.success).toBe(true);
  });

  it("مدينة بمسافات فقط لا تُرضي شرط التوصيل", () => {
    const r = checkoutSchema.safeParse({
      ...validCheckout,
      fulfillment: "DELIVERY",
      city: "   ",
      addressLine: "x",
    });
    expect(r.success).toBe(false);
  });

  it("سلة فارغة مرفوضة", () => {
    const r = checkoutSchema.safeParse({ ...validCheckout, items: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)["items"]).toBe("السلة فارغة");
  });

  it.each([
    ["صفر", 0],
    ["سالبة", -5],
    ["كسر", 2.5],
    ["ضخمة جدًا", 1_000_001],
    ["نص", "10"],
  ])("كمية %s مرفوضة", (_label, quantity) => {
    const r = checkoutSchema.safeParse({
      ...validCheckout,
      items: [{ productId: "p1", quantity, selection: {} }],
    });
    expect(r.success).toBe(false);
  });

  it("السعر القادم من المتصفّح لا يصل للناتج (الخادم يعيد الحساب)", () => {
    const r = checkoutSchema.safeParse({
      ...validCheckout,
      total: 0.01,
      items: [{ productId: "p1", quantity: 1, selection: {}, unitPrice: 0.01, lineTotal: 0.01 }],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty("total");
      expect(r.data.items[0]).not.toHaveProperty("unitPrice");
      expect(r.data.items[0]).not.toHaveProperty("lineTotal");
    }
  });

  it("طريقة دفع أو استلام مجهولة مرفوضة", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, paymentMethod: "BITCOIN" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, fulfillment: "DRONE" }).success).toBe(false);
  });

  it("selection بقيم غير نصية مرفوضة", () => {
    const r = checkoutSchema.safeParse({
      ...validCheckout,
      items: [{ productId: "p1", quantity: 1, selection: { size: { $gt: "" } } }],
    });
    expect(r.success).toBe(false);
  });

  it("ملاحظات أطول من الحد مرفوضة", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, notes: "ن".repeat(1001) }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("صحيح", () => {
    expect(loginSchema.safeParse({ email: "admin@example.com", password: "x" }).success).toBe(true);
  });

  it("بريد خاطئ أو كلمة مرور فارغة", () => {
    expect(loginSchema.safeParse({ email: "admin", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("كلمة المرور لا تُقصّ (المسافات جزء منها)", () => {
    const r = loginSchema.safeParse({ email: "a@b.co", password: "  pw  " });
    expect(r.success && r.data.password).toBe("  pw  ");
  });

  it("كلمة مرور فوق ٢٠٠ حرف مرفوضة (حماية bcrypt من نصوص ضخمة)", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x".repeat(201) }).success).toBe(false);
  });
});

describe("fieldErrors", () => {
  it("يحتفظ بأول رسالة لكل حقل", () => {
    const r = contactMessageSchema.safeParse({ name: "", phone: "", message: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = fieldErrors(r.error);
      expect(Object.keys(errs).sort()).toEqual(["message", "name", "phone"]);
      for (const msg of Object.values(errs)) expect(typeof msg).toBe("string");
    }
  });
});
