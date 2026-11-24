"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useGSAP } from "@gsap/react";

import { useCart } from "@/components/cart/CartProvider";
import { ChoiceCard } from "@/components/checkout/ChoiceCard";
import { AreaField, SelectField, TextField } from "@/components/checkout/CheckoutFields";
import { CheckoutSummary, type CouponState } from "@/components/checkout/CheckoutSummary";
import { ShopIcon } from "@/components/shop/ShopIcon";
import { useCartQuote } from "@/components/shop/useCartQuote";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { FULFILLMENT_LABELS, SAUDI_CITIES } from "@/lib/constants";
import {
  buildOrderPayload,
  clearDraft,
  EMPTY_VALUES,
  loadDraft,
  saveDraft,
  stepOfField,
  STEPS,
  validateValues,
  type CheckoutValues,
  type FieldName,
} from "@/lib/shop/checkout-form";
import { saveLastOrder } from "@/lib/shop/last-order";
import { formatLocalPhone } from "@/lib/shop/phone";
import type { PaymentOption } from "@/lib/shop/payments";
import type { QuoteShipping } from "@/lib/shop/quote";
import { gsap, MOTION_OK } from "@/lib/gsap";
import { whatsappHelpUrl } from "@/lib/shop/wa";
import { cn, formatNumber, formatPrice } from "@/lib/utils";

export type PickupInfo = {
  city: string;
  addressLine: string;
  workingHours: string;
};

/**
 * رحلة الدفع كضيف: بياناتك ← التسليم ← الدفع ← المراجعة.
 *
 * مبادئ التصميم:
 *  - حقلان إلزاميان فقط في الخطوة الأولى (الاسم والجوال)، والباقي اختياري ومطويّ.
 *  - التحقق فوري عند مغادرة الحقل بعبارات بشرية، والأخطاء تُعاد تقييمها أثناء الكتابة.
 *  - ملخّص ثابت فيه الشحن والضريبة والكوبون قبل الخطوة الأخيرة.
 *  - زر الإرسال يُعطَّل فور الضغط (ومرجع قفل) فلا يتكرر الطلب.
 *  - المسوّدة تُحفظ محليًا فلا يضيع ما كُتب لو رجع العميل.
 */
export function CheckoutForm({
  paymentOptions,
  pickup,
  onFinished,
}: {
  paymentOptions: PaymentOption[];
  pickup: PickupInfo;
  /** يُستدعى قبل تفريغ السلة كي لا تومض «السلة فارغة» أثناء الانتقال. */
  onFinished: () => void;
}) {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();

  const [values, setValues] = useState<CheckoutValues>(() => ({
    ...EMPTY_VALUES,
    ...loadDraft(),
  }));
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMore, setShowMore] = useState(() => Boolean(values.email || values.company));
  const [showAddressMore, setShowAddressMore] = useState(
    () => Boolean(values.district || values.postal),
  );
  const [showNotes, setShowNotes] = useState(false);
  const [mobileSummary, setMobileSummary] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  const lock = useRef(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const stepChanged = useRef(false);

  const delivery = values.fulfillment === "DELIVERY";

  // خيارات الدفع المناسبة لطريقة الاستلام؛ الأول المتاح هو الافتراضي
  const visibleOptions = useMemo(
    () => paymentOptions.filter((option) => option.fulfillments.includes(values.fulfillment)),
    [paymentOptions, values.fulfillment],
  );
  const chosen =
    visibleOptions.find((option) => option.id === values.paymentId && option.status === "available") ??
    visibleOptions.find((option) => option.status === "available") ??
    null;

  const errors = useMemo(() => validateValues(values, Boolean(chosen)), [values, chosen]);

  const { quote, lastQuote, loading, error: quoteError, retry } = useCartQuote(items, {
    fulfillment: values.fulfillment,
    city: delivery ? values.city : undefined,
    couponCode: couponCode || undefined,
  });
  const shownQuote = quote ?? lastQuote;

  // حفظ المسوّدة (كتابة فقط — لا ضبط حالة)
  useEffect(() => {
    saveDraft(values);
  }, [values]);

  function set<K extends FieldName>(field: K, value: CheckoutValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    if (serverErrors[field]) {
      setServerErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  const touch = (field: FieldName) => setTouched((current) => ({ ...current, [field]: true }));

  /** الخطأ الظاهر: بعد لمس الحقل، أو بعد محاولة التقدّم في خطوته، أو من الخادم. */
  function shown(field: FieldName): string | undefined {
    if (serverErrors[field]) return serverErrors[field];
    const visible = touched[field] || attempted[stepOfField(field)];
    return visible ? errors[field] : undefined;
  }

  const valid = (field: FieldName) => Boolean(touched[field]) && !errors[field] && Boolean(values[field]);

  // --- حركة الانتقال بين الخطوات وإدارة التركيز ---
  useGSAP(
    () => {
      if (!stepChanged.current || !panelRef.current) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          panelRef.current,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", clearProps: "opacity,transform" },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [step] },
  );

  useEffect(() => {
    if (!stepChanged.current) return;
    headingRef.current?.focus({ preventScroll: true });
    const top = topRef.current;
    if (top && top.getBoundingClientRect().top < 0) {
      top.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

  function goTo(next: number) {
    stepChanged.current = true;
    setStep(next);
  }

  function focusFirstError(fields: readonly FieldName[], source: Partial<Record<FieldName, string>>) {
    const first = fields.find((field) => source[field]);
    if (!first) return;
    const id = FIELD_IDS[first];
    requestAnimationFrame(() => {
      const element = document.getElementById(id);
      element?.focus();
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function next() {
    const fields = STEPS[step].fields;
    setAttempted((current) => ({ ...current, [step]: true }));

    const blocking = fields.filter((field) => errors[field] && field !== "accept");
    if (blocking.length > 0) {
      focusFirstError(fields, errors);
      return;
    }
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (step < STEPS.length - 1) {
      next();
      return;
    }

    if (lock.current || submitting) return;

    setAttempted({ 0: true, 1: true, 2: true, 3: true });

    const allFields = STEPS.flatMap((entry) => entry.fields) as FieldName[];
    const firstBad = allFields.find((field) => errors[field]);
    if (firstBad) {
      const badStep = stepOfField(firstBad);
      if (badStep !== step) goTo(badStep);
      focusFirstError(allFields, errors);
      return;
    }

    if (!chosen) return;
    if (shownQuote && !shownQuote.payable) {
      setFormMessage("في سلتك بند يحتاج مراجعة. ارجع إلى السلة وعدّله ثم أكمل الطلب.");
      return;
    }

    lock.current = true;
    setSubmitting(true);
    setFormMessage(null);
    setServerErrors({});

    const payload = buildOrderPayload({
      values,
      items,
      method: chosen.method,
      couponCode: shownQuote?.coupon?.code,
      website: honeypot.current?.value ?? "",
    });

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        errors?: Record<string, string>;
        orderNumber?: string;
        total?: number;
        payment?: { type: "none" } | { type: "redirect"; url: string };
      };

      if (!response.ok || !result.ok || !result.orderNumber) {
        lock.current = false;
        setSubmitting(false);
        const mapped = mapServerErrors(result.errors);
        setServerErrors(mapped.fields);
        setFormMessage(result.message ?? "تعذّر إتمام الطلب. حاول مرة أخرى.");
        if (mapped.firstStep !== null) goTo(mapped.firstStep);
        if (response.status === 429) setFormMessage(result.message ?? "محاولات كثيرة. انتظر قليلًا.");
        return;
      }

      const redirectUrl = result.payment?.type === "redirect" ? result.payment.url : undefined;

      saveLastOrder({
        orderNumber: result.orderNumber,
        total: result.total ?? shownQuote?.total ?? subtotal,
        phone: values.phone,
        name: values.name.trim(),
        paymentMethod: chosen.method,
        fulfillment: values.fulfillment,
        city: delivery ? values.city : "",
        itemCount: items.length,
        createdAt: new Date().toISOString(),
        redirectUrl,
      });

      onFinished();
      clear();
      clearDraft();

      if (redirectUrl) {
        window.location.assign(redirectUrl);
        return;
      }
      router.push(`/checkout/success?order=${encodeURIComponent(result.orderNumber)}`);
    } catch {
      lock.current = false;
      setSubmitting(false);
      setFormMessage(
        "تعذّر الاتصال بالخادم. تحقّق من الإنترنت ثم أعد المحاولة — لم نستلم طلبك بعد.",
      );
    }
  }

  const coupon: CouponState = {
    applied: couponCode,
    apply: (code) => setCouponCode(code.trim().toUpperCase()),
    remove: () => setCouponCode(""),
  };

  const summaryProps = {
    items,
    quote: shownQuote,
    loading,
    error: quoteError,
    onRetry: retry,
    coupon,
    fallbackSubtotal: subtotal,
  };

  const total = shownQuote?.total ?? subtotal;
  const isLast = step === STEPS.length - 1;
  const cityCostHint =
    delivery && values.city && shownQuote?.shipping.mode !== "pending" ? shownQuote?.shipping : null;

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-8 pb-32 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12 lg:pb-0"
    >
      {/* حقل فخّ */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="co-website">اترك هذا الحقل فارغًا</label>
        <input id="co-website" ref={honeypot} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="min-w-0" ref={topRef}>
        <Stepper step={step} onGo={goTo} />

        {/* ملخّص قابل للطيّ على الجوال */}
        <div className="mt-5 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSummary((value) => !value)}
            aria-expanded={mobileSummary}
            aria-controls="mobile-summary"
            className="border-border bg-surface shadow-card flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-4 text-sm font-bold"
          >
            <span className="flex items-center gap-2">
              <Icon name="cart" className="size-4.5" />
              {mobileSummary ? "إخفاء ملخّص الطلب" : "عرض ملخّص الطلب"}
              <span className="text-primary-500 font-medium">({formatNumber(items.length)})</span>
            </span>
            <span className="flex items-center gap-2">
              <Price value={total} size="sm" />
              <Icon
                name="chevronDown"
                className={cn("size-4 transition-transform", mobileSummary && "rotate-180")}
              />
            </span>
          </button>
          <div id="mobile-summary" hidden={!mobileSummary} className="mt-3">
            <CheckoutSummary idPrefix="m" {...summaryProps} />
          </div>
        </div>

        <div ref={panelRef} className="mt-6 min-h-[22rem]">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mb-1 text-xl font-black outline-none md:text-2xl"
          >
            {STEP_TITLES[step]}
          </h2>
          <p className="text-primary-600 mb-6 text-sm leading-relaxed">{STEP_HINTS[step]}</p>

          {formMessage ? (
            <Alert tone="danger" live title="تعذّر إتمام الطلب" className="mb-6">
              {formMessage}
            </Alert>
          ) : null}

          {/* ---------- ١. بياناتك ---------- */}
          {step === 0 ? (
            <div className="space-y-5">
              <TextField
                id="field-name"
                label="الاسم"
                required
                value={values.name}
                onChange={(event) => set("name", event.target.value)}
                onBlur={() => touch("name")}
                autoComplete="name"
                enterKeyHint="next"
                placeholder="الاسم الكامل أو اسم المسؤول"
                error={shown("name")}
                valid={valid("name")}
              />
              <TextField
                id="field-phone"
                label="رقم الجوال"
                required
                type="tel"
                inputMode="tel"
                dir="ltr"
                value={values.phone}
                onChange={(event) => set("phone", event.target.value)}
                onBlur={() => touch("phone")}
                autoComplete="tel"
                enterKeyHint="next"
                placeholder="05XXXXXXXX"
                className="text-right"
                help="نرسل عليه تأكيد الطلب وتحديثات الحالة على واتساب."
                error={shown("phone")}
                valid={valid("phone")}
              />

              {showMore ? (
                <div className="border-border bg-surface-muted space-y-5 rounded-2xl border p-4 md:p-5">
                  <TextField
                    id="field-email"
                    label="البريد الإلكتروني"
                    optional
                    type="email"
                    inputMode="email"
                    dir="ltr"
                    value={values.email}
                    onChange={(event) => set("email", event.target.value)}
                    onBlur={() => touch("email")}
                    autoComplete="email"
                    enterKeyHint="next"
                    className="text-right"
                    help="لإرسال الفاتورة الضريبية على بريدك."
                    error={shown("email")}
                    valid={valid("email")}
                  />
                  <TextField
                    id="field-company"
                    label="اسم المنشأة"
                    optional
                    value={values.company}
                    onChange={(event) => set("company", event.target.value)}
                    autoComplete="organization"
                    enterKeyHint="next"
                    help="يظهر على الفاتورة إن كان الطلب باسم منشأة."
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMore(true)}
                  className="text-accent-800 hover:text-accent-900 inline-flex min-h-11 items-center gap-2 text-sm font-bold"
                >
                  <Icon name="plus" className="size-4" strokeWidth={2.2} />
                  أحتاج فاتورة باسم منشأة أو أرغب بإرسالها على بريدي
                </button>
              )}
            </div>
          ) : null}

          {/* ---------- ٢. التسليم ---------- */}
          {step === 1 ? (
            <div className="space-y-6">
              <fieldset>
                <legend className="sr-only">طريقة الاستلام</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChoiceCard
                    id="fulfillment-DELIVERY"
                    name="fulfillment"
                    value="DELIVERY"
                    icon="truck"
                    title={FULFILLMENT_LABELS.DELIVERY}
                    description="نشحن طلبك إلى عنوانك عبر شركة شحن، وتُحسب التكلفة حسب مدينتك."
                    checked={delivery}
                    onChange={() => set("fulfillment", "DELIVERY")}
                  />
                  <ChoiceCard
                    id="fulfillment-PICKUP"
                    name="fulfillment"
                    value="PICKUP"
                    shopIcon="store"
                    title={FULFILLMENT_LABELS.PICKUP}
                    description="استلم طلبك من مقرّنا — بلا رسوم شحن."
                    badge={
                      <span className="bg-success-50 text-success-700 rounded-full px-2 py-0.5 text-[0.7rem] font-bold">
                        مجانًا
                      </span>
                    }
                    checked={!delivery}
                    onChange={() => set("fulfillment", "PICKUP")}
                  />
                </div>
              </fieldset>

              {delivery ? (
                <div className="space-y-5">
                  <SelectField
                    id="field-city"
                    label="المدينة"
                    required
                    value={values.city}
                    onChange={(event) => {
                      set("city", event.target.value);
                      touch("city");
                    }}
                    onBlur={() => touch("city")}
                    autoComplete="address-level2"
                    error={shown("city")}
                  >
                    <option value="" disabled>
                      اختر المدينة
                    </option>
                    {SAUDI_CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </SelectField>

                  {cityCostHint ? <ShippingNote shipping={cityCostHint} /> : null}

                  <AreaField
                    id="field-address"
                    label="العنوان"
                    required
                    rows={2}
                    value={values.address}
                    onChange={(event) => set("address", event.target.value)}
                    onBlur={() => touch("address")}
                    autoComplete="street-address"
                    placeholder="الحي، الشارع، رقم المبنى، أقرب معلم"
                    error={shown("address")}
                  />

                  {showAddressMore ? (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <TextField
                        id="field-district"
                        label="الحي"
                        optional
                        value={values.district}
                        onChange={(event) => set("district", event.target.value)}
                        autoComplete="address-level3"
                      />
                      <TextField
                        id="field-postal"
                        label="الرمز البريدي"
                        optional
                        inputMode="numeric"
                        dir="ltr"
                        className="text-right"
                        value={values.postal}
                        onChange={(event) => set("postal", event.target.value)}
                        autoComplete="postal-code"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddressMore(true)}
                      className="text-accent-800 hover:text-accent-900 inline-flex min-h-11 items-center gap-2 text-sm font-bold"
                    >
                      <Icon name="plus" className="size-4" strokeWidth={2.2} />
                      إضافة الحي أو الرمز البريدي
                    </button>
                  )}
                </div>
              ) : (
                <div className="border-border bg-surface-muted flex gap-3.5 rounded-2xl border p-4 md:p-5">
                  <span className="bg-ink text-accent-400 grid size-11 shrink-0 place-items-center rounded-xl">
                    <ShopIcon name="pin" className="size-5" />
                  </span>
                  <div className="text-sm leading-relaxed">
                    <p className="text-primary-950 font-bold">
                      {pickup.city}
                      {pickup.addressLine && pickup.addressLine !== pickup.city
                        ? ` — ${pickup.addressLine}`
                        : ""}
                    </p>
                    <p className="text-primary-600 mt-1">أوقات العمل: {pickup.workingHours}</p>
                    <p className="text-primary-600 mt-1">
                      نبلغك على واتساب فور جاهزية الطلب قبل حضورك.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* ---------- ٣. الدفع ---------- */}
          {step === 2 ? (
            <fieldset>
              <legend className="sr-only">طريقة الدفع</legend>
              <div className="grid gap-3">
                {visibleOptions.map((option) => {
                  const soon = option.status === "coming-soon";
                  return (
                    <ChoiceCard
                      key={option.id}
                      id={`payment-${option.id}`}
                      name="payment"
                      value={option.id}
                      shopIcon={option.icon}
                      title={option.label}
                      description={option.description}
                      disabled={soon}
                      badge={
                        soon ? (
                          <span className="bg-primary-100 text-primary-700 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold">
                            قريبًا
                          </span>
                        ) : null
                      }
                      checked={chosen?.id === option.id}
                      onChange={() => set("paymentId", option.id)}
                    />
                  );
                })}
              </div>

              {!chosen ? (
                <Alert tone="warning" className="mt-4">
                  لا توجد طريقة دفع متاحة لهذا النوع من الاستلام حاليًا. تواصل معنا على واتساب
                  لإتمام طلبك.
                </Alert>
              ) : (
                <p className="text-primary-600 mt-4 flex items-start gap-2 text-xs leading-relaxed">
                  <ShopIcon name="lock" className="text-primary-400 mt-0.5 size-4" />
                  لا يُطلب منك أي دفع الآن. نؤكد الطلب أولًا ثم نرشدك لإتمام الدفع.
                </p>
              )}
              {shown("paymentId") ? (
                <p role="alert" className="text-danger-600 mt-2 text-xs font-bold">
                  {shown("paymentId")}
                </p>
              ) : null}
            </fieldset>
          ) : null}

          {/* ---------- ٤. المراجعة ---------- */}
          {step === 3 ? (
            <div className="space-y-4">
              <ReviewCard title="بياناتك" onEdit={() => goTo(0)}>
                <p className="font-bold">{values.name}</p>
                <p className="text-primary-600" dir="ltr">
                  <span className="inline-block text-right">{formatLocalPhone(values.phone) || values.phone}</span>
                </p>
                {values.email ? <p className="text-primary-600">{values.email}</p> : null}
                {values.company ? <p className="text-primary-600">{values.company}</p> : null}
              </ReviewCard>

              <ReviewCard title="التسليم" onEdit={() => goTo(1)}>
                {delivery ? (
                  <>
                    <p className="font-bold">التوصيل إلى {values.city}</p>
                    <p className="text-primary-600">{values.address}</p>
                    {shownQuote?.shipping.estimatedDays ? (
                      <p className="text-primary-600">
                        مدة الشحن: {shownQuote.shipping.estimatedDays} — تبدأ بعد انتهاء التنفيذ.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="font-bold">الاستلام من الفرع</p>
                    <p className="text-primary-600">
                      {pickup.city}
                      {pickup.addressLine && pickup.addressLine !== pickup.city
                        ? ` — ${pickup.addressLine}`
                        : ""}
                    </p>
                  </>
                )}
              </ReviewCard>

              <ReviewCard title="الدفع" onEdit={() => goTo(2)}>
                <p className="font-bold">{chosen?.label ?? "—"}</p>
                {chosen ? <p className="text-primary-600">{chosen.description}</p> : null}
              </ReviewCard>

              {showNotes ? (
                <AreaField
                  id="field-notes"
                  label="ملاحظات على الطلب"
                  optional
                  value={values.notes}
                  onChange={(event) => set("notes", event.target.value)}
                  placeholder="أي تعليمات خاصة بالتنفيذ أو التسليم."
                  rows={3}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNotes(true)}
                  className="text-accent-800 hover:text-accent-900 inline-flex min-h-11 items-center gap-2 text-sm font-bold"
                >
                  <Icon name="plus" className="size-4" strokeWidth={2.2} />
                  إضافة ملاحظة على الطلب
                </button>
              )}

              <div className="border-border bg-surface rounded-2xl border p-4 md:p-5">
                <Checkbox
                  id="field-accept"
                  required
                  checked={values.accept}
                  onChange={(event) => set("accept", event.target.checked)}
                  error={shown("accept")}
                  label={
                    <>
                      أوافق على{" "}
                      <Link
                        href="/policies/terms"
                        target="_blank"
                        className="text-accent-800 font-bold underline underline-offset-2"
                      >
                        الشروط والأحكام
                      </Link>{" "}
                      و
                      <Link
                        href="/policies/returns"
                        target="_blank"
                        className="text-accent-800 font-bold underline underline-offset-2"
                      >
                        سياسة الاستبدال
                      </Link>
                    </>
                  }
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* شريط الإجراء: ثابت أسفل الشاشة على الجوال، عادي على الشاشات الكبيرة */}
        <div
          className={cn(
            "border-border bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t p-3 shadow-[0_-8px_28px_-12px_rgb(38_23_71/0.25)] backdrop-blur-md",
            "lg:static lg:z-auto lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none",
          )}
        >
          <div className="mx-auto flex max-w-xl items-center gap-3 lg:mx-0 lg:max-w-none">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                disabled={submitting}
                className="border-border-strong text-primary-800 hover:bg-surface-muted focus-visible:outline-accent-600 inline-flex min-h-13 shrink-0 items-center justify-center gap-2 rounded-xl border bg-surface px-5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
              >
                <ShopIcon name="arrowRight" className="size-4" />
                رجوع
              </button>
            ) : null}

            <Button
              type="submit"
              size="lg"
              fullWidth
              className="min-h-13 flex-1"
              disabled={submitting || (isLast && !chosen)}
              iconAfter={isLast ? undefined : "arrowLeft"}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <span
                    aria-hidden="true"
                    className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  />
                  جارٍ إرسال طلبك…
                </>
              ) : isLast ? (
                <>
                  <ShopIcon name="lock" className="size-4.5" />
                  تأكيد الطلب · {formatPrice(total)} ر.س
                </>
              ) : (
                `التالي: ${STEPS[step + 1].label}`
              )}
            </Button>
          </div>

          <p className="text-primary-500 mt-3 hidden text-xs lg:block">
            تحتاج مساعدة؟{" "}
            <a
              href={whatsappHelpUrl("إتمام طلبي")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-800 font-bold underline underline-offset-2"
            >
              تحدّث معنا على واتساب
            </a>
          </p>
        </div>
      </div>

      {/* ملخّص جانبي على الشاشات الكبيرة */}
      <aside className="hidden lg:block" aria-label="ملخّص الطلب">
        <div className="sticky top-32">
          <CheckoutSummary idPrefix="d" {...summaryProps} />
        </div>
      </aside>
    </form>
  );
}

// ---------------------------------------------------------------------------

const FIELD_IDS: Record<FieldName, string> = {
  name: "field-name",
  phone: "field-phone",
  email: "field-email",
  company: "field-company",
  fulfillment: "fulfillment-DELIVERY",
  city: "field-city",
  address: "field-address",
  district: "field-district",
  postal: "field-postal",
  paymentId: "payment-bank-transfer",
  notes: "field-notes",
  accept: "field-accept",
};

const STEP_TITLES = ["بياناتك", "طريقة التسليم", "طريقة الدفع", "راجع طلبك وأكّده"];
const STEP_HINTS = [
  "حقلان فقط للمتابعة — لا حاجة لإنشاء حساب.",
  "اختر الاستلام من الفرع أو التوصيل، وستظهر لك تكلفة الشحن فورًا.",
  "اختر الطريقة الأنسب لك. لن يُخصم منك شيء قبل تأكيدنا للطلب.",
  "تأكّد من التفاصيل والإجمالي — هذا هو المبلغ النهائي.",
];

/** يحوّل أخطاء الخادم (مفاتيح الـ API) إلى حقول النموذج وخطواتها. */
function mapServerErrors(errors?: Record<string, string>): {
  fields: Partial<Record<FieldName, string>>;
  firstStep: number | null;
} {
  const map: Record<string, FieldName> = {
    customerName: "name",
    customerPhone: "phone",
    customerEmail: "email",
    companyName: "company",
    city: "city",
    addressLine: "address",
    district: "district",
    postalCode: "postal",
    paymentMethod: "paymentId",
    acceptTerms: "accept",
    notes: "notes",
  };

  const fields: Partial<Record<FieldName, string>> = {};
  let firstStep: number | null = null;

  for (const [key, message] of Object.entries(errors ?? {})) {
    const field = map[key];
    if (!field) continue;
    fields[field] = message;
    const stepIndex = stepOfField(field);
    if (firstStep === null || stepIndex < firstStep) firstStep = stepIndex;
  }
  return { fields, firstStep };
}

function Stepper({ step, onGo }: { step: number; onGo: (step: number) => void }) {
  return (
    <nav aria-label="خطوات الطلب">
      <ol className="flex items-center">
        {STEPS.map((entry, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={entry.key} className={cn("flex items-center", index < STEPS.length - 1 && "flex-1")}>
              <button
                type="button"
                onClick={() => done && onGo(index)}
                disabled={!done}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "group flex min-h-11 items-center gap-2.5 rounded-xl py-1 text-start",
                  done && "cursor-pointer",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-xs font-black transition-colors",
                    current && "bg-primary-950 text-white",
                    done && "bg-accent-500 text-accent-contrast",
                    !current && !done && "bg-surface-sunken text-primary-500",
                  )}
                >
                  {done ? <Icon name="check" className="size-4" strokeWidth={2.8} /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-sm font-bold",
                    current ? "text-primary-950" : "hidden text-primary-500 sm:inline",
                    done && "group-hover:text-primary-950",
                  )}
                >
                  {entry.label}
                </span>
              </button>
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-2 h-px flex-1 transition-colors sm:mx-4",
                    done ? "bg-accent-500" : "bg-border-strong",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ShippingNote({ shipping }: { shipping: QuoteShipping }) {
  const free = shipping.mode === "free";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 text-sm",
        free ? "border-success-500/30 bg-success-50 text-success-700" : "border-border bg-surface-muted",
      )}
    >
      <Icon name="truck" className={cn("mt-0.5 size-5", free ? "text-success-600" : "text-primary-600")} />
      <div className="leading-relaxed">
        <p className="font-bold">
          {free ? "الشحن لمدينتك مجاني على هذا الطلب" : `تكلفة الشحن: ${formatPrice(shipping.cost)} ر.س`}
        </p>
        {shipping.estimatedDays ? (
          <p className={free ? "" : "text-primary-600"}>
            مدة الشحن: {shipping.estimatedDays} — تبدأ بعد انتهاء تنفيذ الطلب.
          </p>
        ) : null}
        {shipping.remainingForFree ? (
          <p className="text-primary-600">
            أضف {formatPrice(shipping.remainingForFree)} ر.س لطلبك ليصبح الشحن مجانيًا.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-surface rounded-2xl border p-4 md:p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-primary-500 text-xs font-bold">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-accent-800 hover:text-accent-900 -me-2 inline-flex min-h-11 items-center px-2 text-xs font-bold underline underline-offset-2"
        >
          تعديل
        </button>
      </div>
      <div className="space-y-0.5 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
