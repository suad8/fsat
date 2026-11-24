import { Price } from "@/components/ui/Price";
import { commerce } from "@/config/brand";
import type { QuoteShipping } from "@/lib/shop/quote";
import { cn, formatNumber, formatPrice } from "@/lib/utils";

const money = (value: number) => `${formatPrice(value)} ${commerce.currencySymbol}`;

/**
 * سطور المجاميع المشتركة بين السلة والدفع: مجموع، خصم، شحن، ضريبة، إجمالي.
 * الشحن والضريبة يظهران دائمًا — حتى قبل معرفة المدينة نعرض النطاق الممكن،
 * فلا تأتي أي تكلفة كمفاجأة في الخطوة الأخيرة.
 */
export function TotalsList({
  subtotal,
  discount = 0,
  couponLabel,
  shipping,
  vatAmount,
  vatRate,
  pricesIncludeVat,
  total,
  estimate = false,
  busy = false,
  className,
}: {
  subtotal: number;
  discount?: number;
  couponLabel?: string | null;
  shipping: QuoteShipping | null;
  vatAmount: number;
  vatRate: number;
  pricesIncludeVat: boolean;
  total: number;
  /** في السلة الشحن غير نهائي فنسمّي الإجمالي «تقديريًا». */
  estimate?: boolean;
  busy?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(busy && "opacity-70 transition-opacity", className)} aria-busy={busy}>
      <dl className="space-y-3 text-sm">
        <Row label="المجموع الفرعي" value={money(subtotal)} />

        {discount > 0 ? (
          <Row
            label={couponLabel ? `خصم (${couponLabel})` : "الخصم"}
            value={`−${money(discount)}`}
            tone="success"
          />
        ) : null}

        <Row label="الشحن" value={<ShippingValue shipping={shipping} />} />
        {shipping?.remainingForFree ? (
          <p className="text-accent-800 bg-accent-50 -mt-1 rounded-lg px-3 py-2 text-xs leading-relaxed font-medium">
            أضف {money(shipping.remainingForFree)} لتحصل على شحن مجاني
            {shipping.zoneName ? ` (${shipping.zoneName})` : ""}.
          </p>
        ) : null}

        <Row
          label={
            <>
              ضريبة القيمة المضافة ({formatNumber(Math.round(vatRate * 100))}٪)
              <span className="text-primary-400 block text-[0.7rem] font-normal">
                {pricesIncludeVat ? "مشمولة في الأسعار" : "تُضاف إلى الإجمالي"}
              </span>
            </>
          }
          value={money(vatAmount)}
        />
      </dl>

      <div className="border-border mt-4 flex items-end justify-between gap-3 border-t pt-4">
        <span className="text-primary-950 font-bold">
          {estimate ? "الإجمالي التقديري" : "الإجمالي"}
          <span className="text-primary-500 block text-[0.7rem] font-normal">
            {pricesIncludeVat ? "شامل الضريبة" : "بعد إضافة الضريبة"}
          </span>
        </span>
        <Price value={total} size="lg" />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: "success";
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-primary-600">{label}</dt>
      <dd
        className={cn(
          "text-end font-bold tabular-nums",
          tone === "success" ? "text-success-700" : "text-primary-950",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function ShippingValue({ shipping }: { shipping: QuoteShipping | null }) {
  if (!shipping) {
    return <span className="text-primary-500 text-xs font-normal">يُحتسب حسب المدينة</span>;
  }

  if (shipping.mode === "pickup") {
    return <span className="text-success-700">استلام من الفرع — مجانًا</span>;
  }

  if (shipping.mode === "free") {
    return <span className="text-success-700">مجاني</span>;
  }

  if (shipping.mode === "paid") {
    return <>{money(shipping.cost)}</>;
  }

  // لم تُحدَّد المدينة بعد
  const { range } = shipping;
  if (!range) {
    return <span className="text-primary-500 text-xs font-normal">يُحتسب حسب المدينة</span>;
  }
  return (
    <span className="block">
      {range.min === range.max ? money(range.min) : `${formatPrice(range.min)}–${money(range.max)}`}
      <span className="text-primary-500 block text-[0.7rem] font-normal">حسب مدينة التوصيل</span>
    </span>
  );
}
