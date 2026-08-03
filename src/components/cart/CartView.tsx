"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/CartProvider";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { SmartImage } from "@/components/ui/SmartImage";
import { commerce } from "@/config/brand";
import { formatNumber, formatPrice } from "@/lib/utils";

/**
 * صفحة السلة.
 *
 * الأسعار هنا نسخة من وقت الإضافة وتُعرض للاطّلاع فقط. المبلغ المحصَّل
 * يُعاد حسابه على الخادم عند إتمام الطلب من بيانات المنتج الحالية، لذا
 * ننبّه العميل أن الشحن والضريبة تظهر في الخطوة التالية.
 */
export function CartView() {
  const { items, subtotal, hydrated, updateQuantity, removeItem, clear } = useCart();

  // قبل قراءة التخزين نعرض هيكلاً محايدًا — عرض "السلة فارغة" ثم تغييرها
  // بعد لحظة يبدو كخلل للمستخدم
  if (!hydrated) {
    return (
      <div className="grid gap-4" aria-busy="true" aria-label="جارٍ تحميل السلة">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="border-border bg-surface-muted h-32 animate-pulse rounded-xl border"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="cart"
        title="سلّتك فارغة"
        description="تصفّح منتجاتنا واختر ما يناسبك، أو أرسل مواصفات طلبك واحصل على عرض سعر."
        action={
          <>
            <ButtonLink href="/shop" size="lg">
              تصفّح المنتجات
            </ButtonLink>
            <ButtonLink href="/quote" size="lg" variant="outline">
              طلب عرض سعر
            </ButtonLink>
          </>
        }
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
      {/* --- البنود --- */}
      <div className="lg:col-span-2">
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.lineId}
              className="border-border bg-surface shadow-card rounded-xl border p-4"
            >
              <div className="flex gap-4">
                <Link
                  href={`/shop`}
                  className="w-24 shrink-0 sm:w-28"
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  <SmartImage
                    src={item.imageUrl}
                    alt={item.name}
                    ratio="square"
                    icon="package"
                    className="rounded-lg"
                    sizes="120px"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-bold">{item.name}</h2>

                    <IconButton
                      name="trash"
                      label={`حذف ${item.name} من السلة`}
                      size="sm"
                      onClick={() => removeItem(item.lineId)}
                      className="text-primary-400 hover:bg-danger-50 hover:text-danger-600 shrink-0"
                    />
                  </div>

                  {item.options.length > 0 ? (
                    <dl className="text-primary-600 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      {item.options.map((option) => (
                        <div key={option.key} className="flex gap-1">
                          <dt className="text-primary-500">{option.label}:</dt>
                          <dd className="font-medium">{option.valueLabel}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  {item.notes ? (
                    <p className="text-primary-500 mt-2 line-clamp-2 text-xs">
                      <span className="font-bold">ملاحظات:</span> {item.notes}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="border-border-strong flex items-center rounded-lg border">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                        aria-label={`إنقاص كمية ${item.name}`}
                        className="text-primary-600 hover:bg-surface-sunken grid size-9 place-items-center rounded-r-lg transition-colors"
                      >
                        <Icon name="minus" className="size-3.5" strokeWidth={2.5} />
                      </button>

                      <span className="min-w-14 px-2 text-center text-sm font-bold tabular-nums">
                        {formatNumber(item.quantity)}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                        aria-label={`زيادة كمية ${item.name}`}
                        className="text-primary-600 hover:bg-surface-sunken grid size-9 place-items-center rounded-l-lg transition-colors"
                      >
                        <Icon name="plus" className="size-3.5" strokeWidth={2.5} />
                      </button>
                    </div>

                    <div className="text-left">
                      <Price value={item.total} size="md" />
                      <p className="text-primary-500 mt-0.5 text-xs">
                        {formatPrice(item.unitPrice)} {commerce.currencySymbol} /{" "}
                        {item.unit}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap justify-between gap-3">
          <ButtonLink href="/shop" variant="ghost" icon="arrowLeft">
            متابعة التسوّق
          </ButtonLink>

          <Button
            variant="ghost"
            icon="trash"
            onClick={() => {
              if (confirm("هل تريد إفراغ السلة بالكامل؟")) clear();
            }}
            className="text-danger-600 hover:bg-danger-50"
          >
            إفراغ السلة
          </Button>
        </div>
      </div>

      {/* --- الملخّص --- */}
      <aside className="lg:col-span-1">
        <div className="border-border bg-surface-muted sticky top-24 rounded-xl border p-5">
          <h2 className="mb-4 text-lg font-bold">ملخّص الطلب</h2>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-primary-600">
                المجموع الفرعي ({formatNumber(items.length)}{" "}
                {items.length === 1 ? "بند" : "بنود"})
              </dt>
              <dd className="font-bold tabular-nums">
                {formatPrice(subtotal)} {commerce.currencySymbol}
              </dd>
            </div>

            <div className="flex items-center justify-between">
              <dt className="text-primary-600">الشحن</dt>
              <dd className="text-primary-500 text-xs">يُحتسب في الخطوة التالية</dd>
            </div>

            <div className="flex items-center justify-between">
              <dt className="text-primary-600">ضريبة القيمة المضافة</dt>
              <dd className="text-primary-500 text-xs">
                {commerce.pricesIncludeVat ? "مشمولة في الأسعار" : "تُضاف عند الإتمام"}
              </dd>
            </div>
          </dl>

          <div className="border-border mt-4 flex items-center justify-between border-t pt-4">
            <span className="font-bold">الإجمالي التقديري</span>
            <Price value={subtotal} size="lg" />
          </div>

          <ButtonLink href="/checkout" size="lg" fullWidth className="mt-5" iconAfter="arrowLeft">
            إتمام الطلب
          </ButtonLink>

          <p className="text-primary-500 mt-4 text-xs leading-relaxed">
            تُحتسب تكلفة الشحن حسب مدينتك في الخطوة التالية، ويمكنك اختيار الاستلام
            من الفرع دون رسوم.
          </p>
        </div>
      </aside>
    </div>
  );
}
