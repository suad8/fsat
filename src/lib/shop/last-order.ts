/**
 * لقطة آخر طلب أرسله العميل — تُحفظ في sessionStorage فقط (تُمحى بإغلاق التبويب).
 *
 * الغرض: صفحة النجاح تعرض تفاصيل طلبه دون أن نمرّر المبلغ أو الجوال في الرابط
 * (الرابط قابل للتعديل والمشاركة)، وصفحة التتبّع تملأ الحقول تلقائيًا.
 * لا تُخزَّن هنا بيانات حساسة غير ما أدخله العميل نفسه.
 */

export type LastOrder = {
  orderNumber: string;
  total: number;
  phone: string;
  name: string;
  paymentMethod: string;
  fulfillment: "PICKUP" | "DELIVERY";
  city: string;
  itemCount: number;
  createdAt: string;
  redirectUrl?: string;
};

const KEY = "fsat.last-order.v1";

export function saveLastOrder(order: LastOrder): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // التخزين معطّل: صفحة النجاح تعمل برقم الطلب من الرابط
  }
}

let cachedRaw: string | null = null;
let cachedValue: LastOrder | null = null;

/** يعيد نفس المرجع ما دام المحتوى لم يتغيّر (شرط useSyncExternalStore). */
export function readLastOrder(): LastOrder | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }

  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;

  try {
    const parsed = raw ? (JSON.parse(raw) as LastOrder) : null;
    cachedValue =
      parsed && typeof parsed.orderNumber === "string" && typeof parsed.total === "number"
        ? parsed
        : null;
  } catch {
    cachedValue = null;
  }
  return cachedValue;
}

export function subscribeNever(): () => void {
  return () => {};
}
