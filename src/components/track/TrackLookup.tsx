"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useGSAP } from "@gsap/react";

import { CopyButton } from "@/components/shop/CopyButton";
import { ShopIcon } from "@/components/shop/ShopIcon";
import { TextField } from "@/components/checkout/CheckoutFields";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { commerce } from "@/config/brand";
import { gsap, MOTION_OK } from "@/lib/gsap";
import { readLastOrder, subscribeNever } from "@/lib/shop/last-order";
import { normalizeOrderNumber, orderNumberError, phoneError } from "@/lib/shop/phone";
import type { TrackedOrder } from "@/lib/shop/tracking";
import { whatsappOrderUrl } from "@/lib/shop/wa";
import { cn, formatNumber, formatPrice } from "@/lib/utils";

type Result =
  | { kind: "idle" }
  | { kind: "found"; order: TrackedOrder }
  | { kind: "failed"; message: string; limited: boolean };

const dateFormat = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { day: "numeric", month: "long" });
const longDate = new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const time = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { hour: "numeric", minute: "2-digit" });

/**
 * تتبّع الطلب برقم الطلب + الجوال. لا نعرض شيئًا إلا إذا تطابق الاثنان،
 * وأي عدم تطابق يعطي الرسالة نفسها فلا تُستخدم الصفحة لتخمين الأرقام.
 */
export function TrackLookup({ initialOrder }: { initialOrder: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState({ order: false, phone: false });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const lock = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const last = useSyncExternalStore(subscribeNever, readLastOrder, () => null);

  const orderIssue = orderNumberError(orderNumber);
  const phoneIssue = phoneError(phone);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (orderIssue || phoneIssue) {
      document.getElementById(orderIssue ? "track-order" : "track-phone")?.focus();
      return;
    }
    if (lock.current) return;
    lock.current = true;
    setLoading(true);

    try {
      const response = await fetch("/api/shop/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: normalizeOrderNumber(orderNumber), phone }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        order?: TrackedOrder;
      };

      if (response.ok && data.ok && data.order) {
        setResult({ kind: "found", order: data.order });
        requestAnimationFrame(() =>
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      } else {
        setResult({
          kind: "failed",
          limited: response.status === 429,
          message: data.message ?? "تعذّر البحث الآن. حاول بعد قليل.",
        });
      }
    } catch {
      setResult({
        kind: "failed",
        limited: false,
        message: "تعذّر الاتصال بالخادم. تحقّق من الإنترنت وأعد المحاولة.",
      });
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <form
        onSubmit={submit}
        noValidate
        className="border-border bg-surface shadow-card rounded-2xl border p-5 md:p-8"
      >
        <h2 className="text-lg font-bold md:text-xl">أين طلبي؟</h2>
        <p className="text-primary-600 mt-1.5 mb-6 text-sm leading-relaxed">
          اكتب رقم الطلب والجوال الذي سجّلت به الطلب لتعرف مرحلته وموعد التسليم المتوقع.
        </p>

        {last && !phone && (!orderNumber || orderNumber === last.orderNumber) ? (
          <button
            type="button"
            onClick={() => {
              setOrderNumber(last.orderNumber);
              setPhone(last.phone);
            }}
            className="border-accent-500/40 bg-accent-50/60 text-accent-900 hover:bg-accent-50 mb-5 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 text-sm font-bold transition-colors"
          >
            <span>
              طلبك الأخير <span dir="ltr">{last.orderNumber}</span>
            </span>
            <span className="text-accent-800 text-xs underline underline-offset-2">تعبئة تلقائية</span>
          </button>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="track-order"
            label="رقم الطلب"
            required
            dir="ltr"
            className="text-right uppercase"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, order: true }))}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="ORD-2026-0001"
            error={touched.order || submitted ? orderIssue : null}
          />
          <TextField
            id="track-phone"
            label="رقم الجوال"
            required
            type="tel"
            inputMode="tel"
            dir="ltr"
            className="text-right"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
            autoComplete="tel"
            enterKeyHint="search"
            placeholder="05XXXXXXXX"
            error={touched.phone || submitted ? phoneIssue : null}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          className="mt-6 min-h-13"
          disabled={loading}
          icon={loading ? undefined : "search"}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
              />
              جارٍ البحث…
            </>
          ) : (
            "تتبّع الطلب"
          )}
        </Button>
      </form>

      <div ref={resultRef} className="scroll-mt-28" aria-live="polite">
        {result.kind === "failed" ? (
          <div className="mt-6">
            <Alert tone={result.limited ? "warning" : "danger"} live title="لم نتمكّن من عرض الطلب">
              {result.message}
            </Alert>
            <p className="text-primary-600 mt-3 text-sm">
              لا تزال المشكلة؟{" "}
              <a
                href={whatsappOrderUrl(normalizeOrderNumber(orderNumber) || "—", "follow")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-800 font-bold underline underline-offset-2"
              >
                راسلنا على واتساب
              </a>{" "}
              وسنتحقق لك.
            </p>
          </div>
        ) : null}

        {result.kind === "found" ? <OrderStatus order={result.order} /> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function OrderStatus({ order }: { order: TrackedOrder }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          "[data-rise]",
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55, stagger: 0.08, ease: "power3.out", clearProps: "opacity,transform" },
        );
        gsap.fromTo(
          "[data-progress]",
          { scaleY: 0 },
          { scaleY: 1, duration: 0.9, ease: "power2.out", transformOrigin: "top", clearProps: "transform" },
        );
      });
      return () => mm.revert();
    },
    { scope },
  );

  const delivered = order.status === "DELIVERED";

  return (
    <div ref={scope} className="mt-6 space-y-5">
      <section data-rise className="border-border bg-surface shadow-card rounded-2xl border p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-primary-500 text-xs font-bold">رقم الطلب</p>
            <p className="mt-1 font-mono text-2xl font-black" dir="ltr">
              {order.orderNumber}
            </p>
            <p className="text-primary-500 mt-1 text-xs">
              أُرسل في {longDate.format(new Date(order.createdAt))}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black",
              order.cancelled
                ? "bg-danger-50 text-danger-700"
                : delivered
                  ? "bg-success-50 text-success-700"
                  : "bg-accent-100 text-accent-900",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full",
                order.cancelled ? "bg-danger-600" : delivered ? "bg-success-600" : "bg-accent-600",
              )}
            />
            {order.statusLabel}
          </span>
        </div>

        {order.cancelled ? (
          <Alert tone="danger" className="mt-5">
            أُلغي هذا الطلب. إن لم تطلب الإلغاء أو تريد إعادة الطلب، تواصل معنا على واتساب.
          </Alert>
        ) : order.eta ? (
          <div className="bg-surface-muted mt-5 flex items-start gap-3.5 rounded-xl p-4">
            <span className="bg-ink text-accent-400 grid size-11 shrink-0 place-items-center rounded-xl">
              <ShopIcon name="calendar" className="size-5" />
            </span>
            <div className="text-sm leading-relaxed">
              <p className="text-primary-500 text-xs font-bold">
                {order.fulfillment === "PICKUP" ? "الجاهزية المتوقعة" : "التسليم المتوقع"}
              </p>
              <p className="text-primary-950 text-base font-black">
                {dateFormat.format(new Date(order.eta.from))}
                {order.eta.from.slice(0, 10) !== order.eta.to.slice(0, 10)
                  ? ` – ${dateFormat.format(new Date(order.eta.to))}`
                  : ""}
              </p>
              <p className="text-primary-500 mt-1 text-xs">
                تقدير من مدة تنفيذ المنتجات{order.fulfillment === "DELIVERY" ? " ومدة الشحن" : ""}؛
                قد يتغيّر بعد تأكيد التصميم، وسنبلغك بأي تعديل.
              </p>
            </div>
          </div>
        ) : null}

        {order.paymentPending && !order.cancelled ? (
          <p className="text-primary-600 mt-4 flex items-center gap-2 text-sm">
            <ShopIcon name="receipt" className="text-primary-400 size-4.5" />
            حالة الدفع: {order.paymentStatusLabel}
          </p>
        ) : null}
      </section>

      {!order.cancelled ? (
        <section data-rise className="border-border bg-surface rounded-2xl border p-5 md:p-7">
          <h2 className="mb-5 text-lg font-bold">مراحل الطلب</h2>
          <ol>
            {order.timeline.map((step, index) => {
              const last = index === order.timeline.length - 1;
              return (
                <li key={step.status} className="relative flex gap-4 pb-7 last:pb-0">
                  {!last ? (
                    <span
                      aria-hidden="true"
                      className="bg-border-strong absolute start-[1.05rem] top-9 bottom-0 w-0.5"
                    >
                      {step.state === "done" ? (
                        <span data-progress className="bg-accent-500 absolute inset-0" />
                      ) : null}
                    </span>
                  ) : null}

                  <span
                    aria-hidden="true"
                    className={cn(
                      "z-10 grid size-[2.15rem] shrink-0 place-items-center rounded-full border-2 text-xs font-black",
                      step.state === "done" && "border-accent-500 bg-accent-500 text-accent-contrast",
                      step.state === "current" &&
                        "border-primary-950 bg-primary-950 ring-accent-500/30 text-white ring-4",
                      step.state === "upcoming" && "border-border-strong bg-surface text-primary-400",
                    )}
                  >
                    {step.state === "done" ? (
                      <Icon name="check" className="size-4" strokeWidth={3} />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <div className="min-w-0 pt-1" aria-current={step.state === "current" ? "step" : undefined}>
                    <p
                      className={cn(
                        "text-sm font-black",
                        step.state === "upcoming" ? "text-primary-500" : "text-primary-950",
                      )}
                    >
                      {step.label}
                      {step.state === "current" ? (
                        <span className="bg-accent-100 text-accent-900 ms-2 rounded-full px-2 py-0.5 text-[0.65rem] font-bold">
                          المرحلة الحالية
                        </span>
                      ) : null}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs leading-relaxed",
                        step.state === "upcoming" ? "text-primary-400" : "text-primary-600",
                      )}
                    >
                      {step.description}
                    </p>
                    {step.at ? (
                      <p className="text-primary-500 mt-1 text-[0.7rem]">
                        {longDate.format(new Date(step.at))} · {time.format(new Date(step.at))}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <section data-rise className="border-border bg-surface rounded-2xl border p-5 md:p-7">
        <h2 className="mb-4 text-lg font-bold">محتوى الطلب</h2>
        <ul className="divide-border divide-y">
          {order.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">{item.name}</p>
                <p className="text-primary-600 shrink-0 text-sm tabular-nums">
                  {formatNumber(item.quantity)}
                  {item.unit ? ` ${item.unit}` : ""}
                </p>
              </div>
              {item.options.length > 0 ? (
                <p className="text-primary-500 mt-1 text-xs leading-relaxed">
                  {item.options.join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>

        <dl className="border-border mt-5 space-y-2 border-t pt-4 text-sm">
          <Line label="المجموع الفرعي" value={order.totals.subtotal} />
          {order.totals.discount > 0 ? (
            <Line label="الخصم" value={-order.totals.discount} good />
          ) : null}
          <Line label="الشحن" value={order.totals.shipping} zeroLabel="بلا رسوم" />
          <Line label="ضريبة القيمة المضافة" value={order.totals.vat} />
          <div className="border-border flex items-center justify-between border-t pt-3">
            <dt className="font-bold">الإجمالي</dt>
            <dd>
              <Price value={order.totals.total} size="lg" />
            </dd>
          </div>
        </dl>
      </section>

      <div data-rise className="flex flex-wrap gap-3">
        <ButtonLink
          href={whatsappOrderUrl(order.orderNumber, "follow")}
          external
          variant="whatsapp"
          icon="whatsapp"
          size="lg"
          className="min-h-13 flex-1"
        >
          اسأل عن طلبك على واتساب
        </ButtonLink>
        <CopyButton value={order.orderNumber} label="نسخ رقم الطلب" className="min-h-13" />
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  zeroLabel,
  good,
}: {
  label: string;
  value: number;
  zeroLabel?: string;
  good?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-primary-600">{label}</dt>
      <dd className={cn("font-bold tabular-nums", good && "text-success-700")}>
        {value === 0 && zeroLabel
          ? zeroLabel
          : `${value < 0 ? "−" : ""}${formatPrice(Math.abs(value))} ${commerce.currencySymbol}`}
      </dd>
    </div>
  );
}
