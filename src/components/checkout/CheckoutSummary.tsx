"use client";

import Link from "next/link";
import { useState } from "react";

import type { CartItem } from "@/components/cart/CartProvider";
import { TotalsList } from "@/components/shop/TotalsList";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { commerce } from "@/config/brand";
import type { CartQuote } from "@/lib/shop/quote";
import { cn, formatNumber, formatPrice } from "@/lib/utils";

export type CouponState = {
  /** الرمز المطبَّق على الطلب (يُرسل للخادم). */
  applied: string;
  apply: (code: string) => void;
  remove: () => void;
};

/**
 * ملخّص الطلب الثابت: البنود، الكوبون، الشحن، الضريبة، الإجمالي.
 * يظهر جانبيًا على الشاشات الكبيرة، وكشريط قابل للطيّ أعلى النموذج على الجوال.
 */
export function CheckoutSummary({
  idPrefix,
  items,
  quote,
  loading,
  error,
  onRetry,
  coupon,
  fallbackSubtotal,
}: {
  idPrefix: string;
  items: CartItem[];
  quote: CartQuote | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  coupon: CouponState;
  fallbackSubtotal: number;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);

  const couponError = quote?.couponError ?? null;
  const appliedOk = quote?.coupon ?? null;

  return (
    <div className="border-border bg-surface shadow-card rounded-2xl border p-5 md:p-6">
      <h2 className="mb-4 text-lg font-bold">ملخّص الطلب</h2>

      <ul className="border-border max-h-72 space-y-3.5 overflow-y-auto border-b pb-4">
        {items.map((item, index) => {
          const line = quote?.lines[index];
          const total = line && line.status === "ok" ? line.lineTotal : item.total;
          return (
            <li key={item.lineId} className="flex gap-3">
              <span className="w-14 shrink-0">
                <SmartImage
                  src={item.imageUrl}
                  alt=""
                  ratio="square"
                  icon="package"
                  className="rounded-lg"
                  sizes="56px"
                />
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block truncate font-bold">{item.name}</span>
                <span className="text-primary-500 block truncate text-xs">
                  {formatNumber(item.quantity)} {item.unit}
                  {item.options.length > 0
                    ? ` — ${item.options.map((option) => option.valueLabel).join("، ")}`
                    : ""}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums">{formatPrice(total)}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4">
        {coupon.applied && appliedOk ? (
          <div className="bg-success-50 text-success-700 flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-bold">
              <Icon name="tag" className="size-4 shrink-0" />
              <span className="truncate" dir="ltr">
                {appliedOk.code}
              </span>
              <span className="font-medium">— {appliedOk.label}</span>
            </span>
            <button
              type="button"
              onClick={coupon.remove}
              className="hover:text-success-800 min-h-11 shrink-0 px-2 text-xs font-bold underline underline-offset-2"
            >
              إزالة
            </button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const code = draft.trim();
              if (code) coupon.apply(code);
            }}
          >
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open || Boolean(coupon.applied)}
              aria-controls={`${idPrefix}-coupon`}
              className="text-accent-800 hover:text-accent-900 inline-flex min-h-11 items-center gap-2 text-sm font-bold transition-colors"
            >
              <Icon name="tag" className="size-4" />
              لديك رمز خصم؟
            </button>

            <div
              id={`${idPrefix}-coupon`}
              hidden={!(open || coupon.applied)}
              className="mt-1 flex gap-2"
            >
              <label htmlFor={`${idPrefix}-coupon-input`} className="sr-only">
                رمز الخصم
              </label>
              <input
                id={`${idPrefix}-coupon-input`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                dir="ltr"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="done"
                placeholder="CODE10"
                aria-invalid={couponError ? true : undefined}
                aria-describedby={couponError ? `${idPrefix}-coupon-error` : undefined}
                className={cn(
                  "bg-surface h-12 min-w-0 flex-1 rounded-xl border px-4 text-base uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50",
                  couponError ? "border-danger-500" : "border-border-strong",
                )}
              />
              <button
                type="submit"
                className="bg-primary-950 hover:bg-primary-900 min-h-12 shrink-0 rounded-xl px-5 text-sm font-bold text-white transition-colors"
              >
                تطبيق
              </button>
            </div>

            {couponError ? (
              <p
                id={`${idPrefix}-coupon-error`}
                role="alert"
                className="text-danger-600 mt-2 flex items-center gap-1.5 text-xs font-bold"
              >
                <Icon name="alert" className="size-3.5" />
                {couponError}
              </p>
            ) : null}
          </form>
        )}
      </div>

      <div className="border-border mt-4 border-t pt-4">
        {quote ? (
          <TotalsList
            subtotal={quote.subtotal}
            discount={quote.discountAmount}
            couponLabel={quote.coupon?.label}
            shipping={quote.shipping}
            vatAmount={quote.vatAmount}
            vatRate={quote.vatRate}
            pricesIncludeVat={quote.pricesIncludeVat}
            total={quote.total}
            busy={loading}
          />
        ) : (
          <div aria-busy={loading}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-primary-600">المجموع الفرعي</span>
              <span className="font-bold tabular-nums">
                {formatPrice(fallbackSubtotal)} {commerce.currencySymbol}
              </span>
            </div>
            <p className="text-primary-500 mt-3 text-xs leading-relaxed">
              {error ? (
                <>
                  تعذّر حساب الشحن والضريبة الآن.{" "}
                  <button
                    type="button"
                    onClick={onRetry}
                    className="text-accent-800 min-h-11 font-bold underline underline-offset-2"
                  >
                    أعد المحاولة
                  </button>
                </>
              ) : (
                "جارٍ حساب الشحن والضريبة…"
              )}
            </p>
          </div>
        )}
      </div>

      <p className="text-primary-500 mt-4 flex items-start gap-2 text-xs leading-relaxed">
        <Icon name="shield" className="text-primary-400 mt-0.5 size-4 shrink-0" />
        تصلك فاتورة ضريبية نظامية، والسعر النهائي هو ما تراه هنا — لا رسوم خفية.
      </p>

      <Link
        href="/cart"
        className="text-primary-600 hover:text-primary-950 mt-3 inline-flex min-h-11 items-center text-xs font-bold transition-colors"
      >
        تعديل السلة
      </Link>
    </div>
  );
}
