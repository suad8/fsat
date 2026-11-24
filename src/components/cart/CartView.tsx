"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { useCart, type CartItem } from "@/components/cart/CartProvider";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { TotalsList } from "@/components/shop/TotalsList";
import { TrustStrip } from "@/components/shop/TrustStrip";
import { useCartQuote } from "@/components/shop/useCartQuote";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { SmartImage } from "@/components/ui/SmartImage";
import { commerce } from "@/config/brand";
import { whatsappCartUrl } from "@/lib/shop/wa";
import { cn, formatNumber, formatPrice } from "@/lib/utils";

/**
 * صفحة السلة.
 *
 * الأسعار المخزّنة في المتصفّح نسخة وقت الإضافة، لذا نحقّقها من الخادم عند
 * الفتح وعند كل تعديل كمية (الشرائح السعرية تغيّر سعر الوحدة)، ونعرض
 * الشحن والضريبة صراحةً قبل الانتقال للدفع. المبلغ المحصَّل النهائي يعاد
 * حسابه على الخادم عند الإرسال دائمًا.
 */
export function CartView() {
  const { items, subtotal, hydrated, updateQuantity, removeItem, clear, applyServerPrices } =
    useCart();

  const [notice, setNotice] = useState<string | null>(null);
  const lastUserEdit = useRef(0);

  const { quote, lastQuote, loading, error } = useCartQuote(
    items,
    { fulfillment: "DELIVERY" },
    hydrated,
    (result, sent) => {
      // نعتمد أسعار الخادم في العرض؛ ننبّه فقط إن لم يكن التغيير بسبب تعديل العميل نفسه
      const updates: { lineId: string; quantity: number; unitPrice: number; total: number }[] = [];
      let changedPrices = 0;

      result.lines.forEach((line, index) => {
        const item = sent[index];
        if (!item || line.status !== "ok") return;
        if (line.lineTotal !== item.total || line.quantity !== item.quantity) {
          changedPrices += 1;
          updates.push({
            lineId: item.lineId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            total: line.lineTotal,
          });
        }
      });

      if (updates.length === 0) return;
      applyServerPrices(updates);
      if (Date.now() - lastUserEdit.current > 4000) {
        setNotice(
          changedPrices === 1
            ? "تحدّث سعر بند في سلتك عن وقت إضافته. الأسعار المعروضة الآن هي الحالية."
            : `تحدّثت أسعار ${formatNumber(changedPrices)} بنود في سلتك عن وقت إضافتها. الأسعار المعروضة الآن هي الحالية.`,
        );
      }
    },
  );

  if (!hydrated) {
    return (
      <div className="grid gap-4 lg:grid-cols-3" aria-busy="true" aria-label="جارٍ تحميل السلة">
        <div className="space-y-4 lg:col-span-2">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="border-border bg-surface-muted h-40 animate-pulse rounded-2xl border"
            />
          ))}
        </div>
        <div className="border-border bg-surface-muted hidden h-80 animate-pulse rounded-2xl border lg:block" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="cart"
        title="سلّتك فارغة"
        description="تصفّح المنتجات واختر ما يناسبك، أو أرسل مواصفات طلبك واحصل على عرض سعر."
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

  const shown = quote ?? lastQuote;
  const lineStatus = (index: number) => (quote ? quote.lines[index] : undefined);
  const blocked = quote ? !quote.payable : false;
  const total = shown?.total ?? subtotal;

  const whatsappHref = whatsappCartUrl(
    items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      total: item.total,
      options: item.options,
    })),
    shown?.total ?? subtotal,
  );

  return (
    <div className="grid gap-8 pb-28 lg:grid-cols-3 lg:gap-10 lg:pb-0">
      {/* --- البنود --- */}
      <div className="lg:col-span-2">
        {notice ? (
          <Alert tone="info" live className="mb-5">
            {notice}
          </Alert>
        ) : null}

        {error ? (
          <Alert tone="warning" className="mb-5">
            لم نستطع التحقق من الأسعار الآن؛ الأرقام المعروضة من وقت الإضافة، وسنعيد
            حسابها عند الإتمام.
          </Alert>
        ) : null}

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            البنود{" "}
            <span className="text-primary-500 text-sm font-medium">
              ({formatNumber(items.length)})
            </span>
          </h2>
          <Button
            variant="ghost"
            size="md"
            icon="trash"
            onClick={() => {
              if (confirm("هل تريد إفراغ السلة بالكامل؟")) clear();
            }}
            className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
          >
            إفراغ السلة
          </Button>
        </div>

        <ul className="space-y-4">
          {items.map((item, index) => (
            <CartLine
              key={item.lineId}
              item={item}
              status={lineStatus(index)}
              onQuantity={(next) => {
                lastUserEdit.current = Date.now();
                updateQuantity(item.lineId, next);
              }}
              onRemove={() => removeItem(item.lineId)}
            />
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <ButtonLink href="/shop" variant="ghost" icon="arrowLeft">
            متابعة التسوّق
          </ButtonLink>
          <ButtonLink href="/quote" variant="ghost">
            كميات كبيرة أو مواصفات خاصة؟ اطلب عرض سعر
          </ButtonLink>
        </div>

        <TrustStrip className="mt-8" />
      </div>

      {/* --- الملخّص --- */}
      <aside className="lg:col-span-1" aria-label="ملخّص الطلب">
        <div className="border-border bg-surface shadow-card rounded-2xl border p-5 md:p-6 lg:sticky lg:top-32">
          <h2 className="mb-5 text-lg font-bold">ملخّص الطلب</h2>

          <TotalsList
            subtotal={shown?.subtotal ?? subtotal}
            discount={0}
            shipping={shown?.shipping ?? null}
            vatAmount={shown?.vatAmount ?? 0}
            vatRate={shown?.vatRate ?? commerce.vatRate}
            pricesIncludeVat={shown?.pricesIncludeVat ?? commerce.pricesIncludeVat}
            total={total}
            estimate
            busy={loading}
          />

          {blocked ? (
            <Alert tone="warning" className="mt-5">
              في السلة بند يحتاج انتباهك (موضّح عليه). عدّله أو احذفه لتتمكّن من الإتمام.
            </Alert>
          ) : null}

          <ButtonLink
            href="/checkout"
            size="lg"
            fullWidth
            className={cn("mt-5 min-h-14", blocked && "pointer-events-none opacity-50")}
            iconAfter="arrowLeft"
            aria-disabled={blocked}
            tabIndex={blocked ? -1 : undefined}
          >
            إتمام الطلب
          </ButtonLink>

          <ButtonLink
            href={whatsappHref}
            external
            variant="whatsapp"
            icon="whatsapp"
            fullWidth
            className="mt-2.5 min-h-12"
          >
            أرسل السلة على واتساب
          </ButtonLink>

          <p className="text-primary-500 mt-4 text-xs leading-relaxed">
            الطلب كضيف — لا تسجيل ولا كلمة مرور. تُحسب تكلفة الشحن بدقة عند اختيار مدينتك
            في الخطوة التالية، والاستلام من الفرع بلا رسوم.
          </p>
        </div>
      </aside>

      {/* شريط ثابت على الجوال: الإجمالي والإتمام دائمًا في متناول الإبهام */}
      <div className="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t p-3 shadow-[0_-8px_28px_-12px_rgb(38_23_71/0.25)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-primary-500 block text-[0.7rem]">الإجمالي التقديري</span>
            <Price value={total} size="md" />
          </div>
          <ButtonLink
            href="/checkout"
            size="md"
            iconAfter="arrowLeft"
            className={cn("min-h-12 px-6", blocked && "pointer-events-none opacity-50")}
            aria-disabled={blocked}
          >
            إتمام الطلب
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CartLine({
  item,
  status,
  onQuantity,
  onRemove,
}: {
  item: CartItem;
  status?: { status: string; message?: string };
  onQuantity: (next: number) => void;
  onRemove: () => void;
}) {
  const href = item.href ?? "/shop";
  const problem = status && status.status !== "ok" ? status : null;

  return (
    <li
      className={cn(
        "bg-surface shadow-card rounded-2xl border p-4 md:p-5",
        problem ? "border-danger-500/50" : "border-border",
      )}
    >
      <div className="flex gap-4">
        <Link href={href} className="w-24 shrink-0 sm:w-28" aria-label={`فتح ${item.name}`}>
          <SmartImage
            src={item.imageUrl}
            alt=""
            ratio="square"
            icon="package"
            className="rounded-xl"
            sizes="120px"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base leading-snug font-bold">
              <Link href={href} className="hover:text-accent-800 transition-colors">
                {item.name}
              </Link>
            </h3>

            <IconButton
              name="trash"
              label={`حذف ${item.name} من السلة`}
              size="md"
              onClick={onRemove}
              className="text-primary-400 hover:bg-danger-50 hover:text-danger-600 -mt-1 -me-1 shrink-0"
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

          {item.files && item.files.length > 0 ? (
            <p className="text-primary-600 mt-2 flex items-center gap-1.5 text-xs">
              <Icon name="file" className="size-3.5" />
              {formatNumber(item.files.length)} {item.files.length === 1 ? "ملف تصميم" : "ملفات تصميم"}{" "}
              مرفقة
            </p>
          ) : null}

          {item.notes ? (
            <p className="text-primary-500 mt-2 line-clamp-2 text-xs">
              <span className="font-bold">ملاحظات:</span> {item.notes}
            </p>
          ) : null}

          {problem ? (
            <p role="alert" className="text-danger-700 mt-3 flex items-start gap-1.5 text-xs font-bold">
              <Icon name="alert" className="mt-0.5 size-3.5" />
              {problem.message}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <QuantityStepper
              id={`qty-${item.lineId}`}
              value={item.quantity}
              min={item.minQuantity ?? 1}
              step={item.quantityStep ?? 1}
              onChange={onQuantity}
              label={`كمية ${item.name}`}
            />

            <div className="text-end">
              <Price value={item.total} size="md" />
              <p className="text-primary-500 mt-0.5 text-xs">
                {formatPrice(item.unitPrice)} {commerce.currencySymbol} / {item.unit}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold">
            {item.href ? (
              <Link
                href={item.href}
                className="text-accent-700 hover:text-accent-800 inline-flex min-h-8 items-center transition-colors"
              >
                تعديل المواصفات
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
