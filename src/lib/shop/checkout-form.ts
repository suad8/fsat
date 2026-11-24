import type { CartItem } from "@/components/cart/CartProvider";
import { addressError, emailError, nameError, phoneError, toLatinDigits } from "@/lib/shop/phone";

/**
 * نموذج الدفع: القيم، التحقق الفوري، الخطوات، والمسوّدة المحفوظة.
 * الملف بلا React ولا Prisma — يُستعمل في المتصفّح فقط، ويبقى التحقق
 * النهائي على الخادم (src/lib/validation.ts).
 */

export type FulfillmentChoice = "PICKUP" | "DELIVERY";

export type CheckoutValues = {
  name: string;
  phone: string;
  email: string;
  company: string;
  fulfillment: FulfillmentChoice;
  city: string;
  district: string;
  address: string;
  postal: string;
  /** معرّف خيار الدفع (PaymentOption.id). */
  paymentId: string;
  notes: string;
  accept: boolean;
};

export const EMPTY_VALUES: CheckoutValues = {
  name: "",
  phone: "",
  email: "",
  company: "",
  fulfillment: "DELIVERY",
  city: "",
  district: "",
  address: "",
  postal: "",
  paymentId: "",
  notes: "",
  accept: false,
};

export type FieldName = keyof CheckoutValues;

export const STEPS = [
  { key: "contact", label: "بياناتك", fields: ["name", "phone", "email", "company"] },
  { key: "delivery", label: "التسليم", fields: ["fulfillment", "city", "address", "district", "postal"] },
  { key: "payment", label: "الدفع", fields: ["paymentId"] },
  { key: "review", label: "المراجعة", fields: ["notes", "accept"] },
] as const satisfies readonly { key: string; label: string; fields: readonly FieldName[] }[];

export function stepOfField(field: FieldName): number {
  const index = STEPS.findIndex((step) => (step.fields as readonly string[]).includes(field));
  return index < 0 ? 0 : index;
}

export type FieldErrors = Partial<Record<FieldName, string>>;

/** كل الأخطاء الحالية. الواجهة تقرّر متى تعرضها (بعد لمس الحقل أو محاولة التقدّم). */
export function validateValues(values: CheckoutValues, hasPayment: boolean): FieldErrors {
  const errors: FieldErrors = {};

  const name = nameError(values.name);
  if (name) errors.name = name;

  const phone = phoneError(values.phone);
  if (phone) errors.phone = phone;

  const email = emailError(values.email);
  if (email) errors.email = email;

  if (values.fulfillment === "DELIVERY") {
    if (!values.city) errors.city = "اختر مدينة التوصيل لنحسب لك الشحن بدقة.";
    const address = addressError(values.address);
    if (address) errors.address = address;
  }

  if (!hasPayment) errors.paymentId = "اختر طريقة الدفع.";

  if (!values.accept) errors.accept = "وافق على الشروط والأحكام لإتمام الطلب.";

  return errors;
}

// ---------------------------------------------------------------------------
// المسوّدة (localStorage) — لا يخسر العميل ما كتبه لو رجع أو أغلق الصفحة
// ---------------------------------------------------------------------------

const DRAFT_KEY = "fsat.checkout-draft.v1";

type Draft = Pick<
  CheckoutValues,
  "name" | "phone" | "email" | "company" | "fulfillment" | "city" | "district" | "address" | "postal"
>;

export function loadDraft(): Partial<CheckoutValues> {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Draft>;
    const draft: Partial<CheckoutValues> = {};
    for (const key of ["name", "phone", "email", "company", "city", "district", "address", "postal"] as const) {
      if (typeof parsed[key] === "string") draft[key] = parsed[key];
    }
    if (parsed.fulfillment === "PICKUP" || parsed.fulfillment === "DELIVERY") {
      draft.fulfillment = parsed.fulfillment;
    }
    return draft;
  } catch {
    return {};
  }
}

export function saveDraft(values: CheckoutValues): void {
  const draft: Draft = {
    name: values.name,
    phone: values.phone,
    email: values.email,
    company: values.company,
    fulfillment: values.fulfillment,
    city: values.city,
    district: values.district,
    address: values.address,
    postal: values.postal,
  };
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // التخزين ممتلئ أو معطّل — لا أثر على إتمام الطلب
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // لا شيء
  }
}

// ---------------------------------------------------------------------------

const NOTES_LIMIT = 500;

/**
 * ملاحظات البند المرسلة للخادم. جدول بنود الطلب يحتفظ بالنص فقط، لذا تُضمَّن
 * روابط ملفات التصميم فيه ليفتحها الفريق (الرابط يعمل من لوحة التحكم)،
 * وتُقتطع ملاحظات العميل أولًا إن ضاق الحدّ (٥٠٠ حرف) — الملفات لا تُقتطع.
 */
export function itemNotesForOrder(item: CartItem): string | undefined {
  const files = item.files ?? [];
  const fileText = files.length > 0 ? `ملفات التصميم: ${files.map((file) => file.url).join(" ، ")}` : "";
  const budget = NOTES_LIMIT - fileText.length - (fileText ? 3 : 0);
  const customer = (item.notes ?? "").trim();
  const trimmed = budget > 0 ? customer.slice(0, Math.max(0, budget)) : "";

  const text = [trimmed, fileText].filter(Boolean).join(" — ");
  return text ? text.slice(0, NOTES_LIMIT) : undefined;
}

/** حمولة الإرسال (بلا أسعار — الخادم يحسبها). */
export function buildOrderPayload(args: {
  values: CheckoutValues;
  items: CartItem[];
  method: string;
  couponCode?: string;
  website: string;
}) {
  const { values, items, method, couponCode, website } = args;
  const delivery = values.fulfillment === "DELIVERY";

  return {
    customerName: values.name.trim(),
    customerPhone: toLatinDigits(values.phone).trim(),
    customerEmail: values.email.trim(),
    companyName: values.company.trim(),
    fulfillment: values.fulfillment,
    city: delivery ? values.city : "",
    district: delivery ? values.district.trim() : "",
    addressLine: delivery ? values.address.trim() : "",
    postalCode: delivery ? toLatinDigits(values.postal).trim() : "",
    paymentMethod: method,
    couponCode: couponCode ?? "",
    notes: values.notes.trim(),
    acceptTerms: values.accept,
    website,
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selection: item.selection ?? {},
      notes: itemNotesForOrder(item),
    })),
  };
}
