"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox, OptionCard, Select, TextArea, TextInput } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Price } from "@/components/ui/Price";
import { commerce } from "@/config/brand";
import {
  FULFILLMENT_LABELS,
  PAYMENT_METHOD_DESCRIPTIONS,
  PAYMENT_METHOD_LABELS,
  SAUDI_CITIES,
  type PaymentMethod,
} from "@/lib/constants";
import { formatNumber, formatPrice, round2 } from "@/lib/utils";

export type ShippingZoneView = {
  id: string;
  name: string;
  cities: string[];
  cost: number;
  freeOverAmount: number | null;
  estimatedDays: string | null;
};

/**
 * نموذج إتمام الطلب.
 *
 * المجاميع المعروضة هنا تقديرية للعرض. عند الإرسال لا نرسل أي سعر — فقط
 * المنتج والخيارات والكمية — ويعيد الخادم حساب كل شيء (انظر src/lib/orders.ts).
 */
export function CheckoutForm({
  zones,
  paymentMethods,
  pricesIncludeVat,
  vatRate,
}: {
  zones: ShippingZoneView[];
  paymentMethods: PaymentMethod[];
  pricesIncludeVat: boolean;
  vatRate: number;
}) {
  const router = useRouter();
  const { items, subtotal, hydrated, clear } = useCart();

  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("DELIVERY");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const shipping = useMemo(() => {
    if (fulfillment === "PICKUP" || !city) return { cost: 0, days: null as string | null };

    const zone = zones.find((candidate) => candidate.cities.includes(city));
    if (!zone) {
      // مدينة خارج المناطق المعرّفة — نعرض أعلى تكلفة، وهو ما يفعله الخادم أيضًا
      const fallback = zones.reduce((max, candidate) => Math.max(max, candidate.cost), 0);
      return { cost: fallback, days: null };
    }

    if (zone.freeOverAmount !== null && subtotal >= zone.freeOverAmount) {
      return { cost: 0, days: zone.estimatedDays };
    }

    return { cost: zone.cost, days: zone.estimatedDays };
  }, [fulfillment, city, zones, subtotal]);

  const totals = useMemo(() => {
    const base = round2(subtotal + shipping.cost);
    const vat = pricesIncludeVat
      ? round2(base - base / (1 + vatRate))
      : round2(base * vatRate);
    const total = pricesIncludeVat ? base : round2(base + vat);
    return { vat, total };
  }, [subtotal, shipping.cost, pricesIncludeVat, vatRate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrors({});
    setMessage(null);

    const form = new FormData(event.currentTarget);

    const payload = {
      customerName: form.get("customerName"),
      customerPhone: form.get("customerPhone"),
      customerEmail: form.get("customerEmail") ?? "",
      companyName: form.get("companyName") ?? "",
      fulfillment,
      city: fulfillment === "DELIVERY" ? city : "",
      district: form.get("district") ?? "",
      addressLine: form.get("addressLine") ?? "",
      postalCode: form.get("postalCode") ?? "",
      paymentMethod: form.get("paymentMethod"),
      couponCode: form.get("couponCode") ?? "",
      notes: form.get("notes") ?? "",
      acceptTerms: form.get("acceptTerms") === "on",
      website: form.get("website") ?? "",
      // لا تُرسل أي أسعار — الخادم يحسبها من قاعدة البيانات
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selection: Object.fromEntries(
          item.options.map((option) => [option.key, option.value]),
        ),
        notes: item.notes,
      })),
    };

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setStatus("error");
        setErrors(result.errors ?? {});
        setMessage(result.message ?? "تعذّر إتمام الطلب.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      clear();
      router.push(
        `/checkout/success?order=${encodeURIComponent(result.orderNumber)}&total=${result.total}`,
      );
    } catch {
      setStatus("error");
      setMessage("تعذّر الاتصال بالخادم. تحقّق من اتصالك وحاول مرة أخرى.");
    }
  }

  if (!hydrated) {
    return (
      <div
        className="border-border bg-surface-muted h-96 animate-pulse rounded-xl border"
        aria-busy="true"
        aria-label="جارٍ تحميل بيانات الطلب"
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="cart"
        title="لا توجد منتجات في السلة"
        description="أضف منتجات إلى السلة أولاً حتى تتمكّن من إتمام الطلب."
        action={
          <ButtonLink href="/shop" size="lg">
            تصفّح المنتجات
          </ButtonLink>
        }
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-3 lg:gap-10">
      {/* حقل فخّ */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="co-website">اترك هذا الحقل فارغًا</label>
        <input id="co-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-8 lg:col-span-2">
        {status === "error" && message ? (
          <Alert tone="danger" live title="تعذّر إتمام الطلب">
            {message}
          </Alert>
        ) : null}

        {/* --- بيانات العميل --- */}
        <fieldset>
          <legend className="mb-4 text-lg font-bold">بيانات التواصل</legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput
              id="customerName"
              label="الاسم"
              required
              autoComplete="name"
              error={errors.customerName}
            />
            <TextInput
              id="customerPhone"
              label="رقم الجوال"
              type="tel"
              required
              autoComplete="tel"
              placeholder="05XXXXXXXX"
              error={errors.customerPhone}
            />
            <TextInput
              id="customerEmail"
              label="البريد الإلكتروني"
              type="email"
              optional
              autoComplete="email"
              error={errors.customerEmail}
              help="لإرسال الفاتورة الضريبية إن رغبت."
            />
            <TextInput
              id="companyName"
              label="اسم المنشأة"
              optional
              autoComplete="organization"
              error={errors.companyName}
            />
          </div>
        </fieldset>

        {/* --- طريقة الاستلام --- */}
        <fieldset>
          <legend className="mb-4 text-lg font-bold">طريقة الاستلام</legend>

          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              id="fulfillment-DELIVERY"
              name="fulfillment"
              value="DELIVERY"
              title={FULFILLMENT_LABELS.DELIVERY}
              description="نشحن طلبك إلى عنوانك عبر شركة شحن معتمدة."
              checked={fulfillment === "DELIVERY"}
              onChange={() => setFulfillment("DELIVERY")}
            />
            <OptionCard
              id="fulfillment-PICKUP"
              name="fulfillment"
              value="PICKUP"
              title={FULFILLMENT_LABELS.PICKUP}
              description="استلم طلبك من مقرّنا دون رسوم شحن."
              checked={fulfillment === "PICKUP"}
              onChange={() => setFulfillment("PICKUP")}
            />
          </div>

          {fulfillment === "DELIVERY" ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Select
                id="city"
                label="المدينة"
                required
                value={city}
                onChange={(event) => setCity(event.target.value)}
                error={errors.city}
              >
                <option value="" disabled>
                  اختر المدينة
                </option>
                {SAUDI_CITIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>

              <TextInput
                id="district"
                label="الحي"
                optional
                autoComplete="address-level3"
                error={errors.district}
              />

              <TextInput
                id="addressLine"
                label="العنوان"
                required
                autoComplete="street-address"
                placeholder="الشارع، رقم المبنى، أقرب معلم"
                wrapperClassName="sm:col-span-2"
                error={errors.addressLine}
              />

              <TextInput
                id="postalCode"
                label="الرمز البريدي"
                optional
                autoComplete="postal-code"
                error={errors.postalCode}
              />
            </div>
          ) : (
            <Alert tone="info" className="mt-5">
              سنرسل لك رسالة على واتساب بعنوان المقر وأوقات الاستلام فور جاهزية طلبك.
            </Alert>
          )}
        </fieldset>

        {/* --- طريقة الدفع --- */}
        <fieldset>
          <legend className="mb-4 text-lg font-bold">طريقة الدفع</legend>

          {paymentMethods.length === 0 ? (
            <Alert tone="warning">
              لم تُفعَّل أي طريقة دفع بعد. فعّلها من لوحة التحكم ← بيانات المنشأة.
            </Alert>
          ) : (
            <div className="grid gap-3">
              {paymentMethods.map((method, index) => (
                <OptionCard
                  key={method}
                  id={`payment-${method}`}
                  name="paymentMethod"
                  value={method}
                  title={PAYMENT_METHOD_LABELS[method]}
                  description={PAYMENT_METHOD_DESCRIPTIONS[method]}
                  defaultChecked={index === 0}
                />
              ))}
            </div>
          )}

          {errors.paymentMethod ? (
            <p className="text-danger-600 mt-2 text-xs font-bold">{errors.paymentMethod}</p>
          ) : null}
        </fieldset>

        {/* --- ملاحظات --- */}
        <fieldset>
          <legend className="mb-4 text-lg font-bold">ملاحظات إضافية</legend>
          <TextArea
            id="notes"
            label="ملاحظات على الطلب"
            optional
            rows={3}
            placeholder="أي تعليمات خاصة بالتنفيذ أو التسليم."
            error={errors.notes}
          />
        </fieldset>
      </div>

      {/* --- الملخّص --- */}
      <aside className="lg:col-span-1">
        <div className="border-border bg-surface-muted sticky top-24 rounded-xl border p-5">
          <h2 className="mb-4 text-lg font-bold">ملخّص الطلب</h2>

          <ul className="border-border max-h-64 space-y-3 overflow-y-auto border-b pb-4">
            {items.map((item) => (
              <li key={item.lineId} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="text-primary-500 text-xs">
                    {formatNumber(item.quantity)} {item.unit}
                    {item.options.length > 0
                      ? ` — ${item.options.map((o) => o.valueLabel).join("، ")}`
                      : ""}
                  </span>
                </span>
                <span className="shrink-0 font-bold tabular-nums">
                  {formatPrice(item.total)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <TextInput
              id="couponCode"
              label="رمز الخصم"
              optional
              placeholder="أدخل الرمز إن وجد"
              error={errors.couponCode}
              className="uppercase"
            />
          </div>

          <dl className="border-border mt-4 space-y-2.5 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-primary-600">المجموع الفرعي</dt>
              <dd className="font-bold tabular-nums">
                {formatPrice(subtotal)} {commerce.currencySymbol}
              </dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-primary-600">الشحن</dt>
              <dd className="font-bold tabular-nums">
                {fulfillment === "PICKUP" ? (
                  <span className="text-success-600">استلام من الفرع</span>
                ) : !city ? (
                  <span className="text-primary-400 text-xs font-normal">اختر المدينة</span>
                ) : shipping.cost === 0 ? (
                  <span className="text-success-600">مجاني</span>
                ) : (
                  `${formatPrice(shipping.cost)} ${commerce.currencySymbol}`
                )}
              </dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-primary-600">
                ضريبة القيمة المضافة ({Math.round(vatRate * 100)}٪)
                {pricesIncludeVat ? (
                  <span className="text-primary-400 block text-[0.7rem]">مشمولة</span>
                ) : null}
              </dt>
              <dd className="font-bold tabular-nums">
                {formatPrice(totals.vat)} {commerce.currencySymbol}
              </dd>
            </div>
          </dl>

          <div className="border-border mt-4 flex items-center justify-between border-t pt-4">
            <span className="font-bold">الإجمالي</span>
            <Price value={totals.total} size="lg" />
          </div>

          {shipping.days && fulfillment === "DELIVERY" ? (
            <p className="text-primary-500 mt-3 text-xs">
              مدة الشحن التقديرية: {shipping.days} — تبدأ بعد انتهاء مدة تنفيذ الطلب.
            </p>
          ) : null}

          <div className="mt-5">
            <Checkbox
              id="acceptTerms"
              name="acceptTerms"
              required
              error={errors.acceptTerms}
              label={
                <>
                  أوافق على{" "}
                  <Link
                    href="/policies/terms"
                    target="_blank"
                    className="text-accent-700 font-bold underline underline-offset-2"
                  >
                    الشروط والأحكام
                  </Link>{" "}
                  و
                  <Link
                    href="/policies/returns"
                    target="_blank"
                    className="text-accent-700 font-bold underline underline-offset-2"
                  >
                    سياسة الاستبدال
                  </Link>
                </>
              }
            />
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            className="mt-5"
            disabled={status === "submitting" || paymentMethods.length === 0}
          >
            {status === "submitting" ? "جارٍ إرسال الطلب…" : "تأكيد الطلب"}
          </Button>

          <p className="text-primary-500 mt-4 text-xs leading-relaxed">
            بعد التأكيد سنراجع طلبك ونتواصل معك خلال يوم عمل لتأكيد التفاصيل وبدء
            التنفيذ.
          </p>
        </div>
      </aside>
    </form>
  );
}
