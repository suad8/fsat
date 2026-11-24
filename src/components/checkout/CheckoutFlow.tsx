"use client";

import { useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { CheckoutForm, type PickupInfo } from "@/components/checkout/CheckoutForm";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PaymentOption } from "@/lib/shop/payments";

/**
 * بوابة صفحة الدفع: تنتظر قراءة السلة، وتعرض حالة فارغة عند عدم وجود بنود،
 * وتبقي شاشة «تم الاستلام» بعد الإرسال كي لا تومض «السلة فارغة» أثناء
 * الانتقال لصفحة النجاح.
 */
export function CheckoutFlow({
  paymentOptions,
  pickup,
}: {
  paymentOptions: PaymentOption[];
  pickup: PickupInfo;
}) {
  const { items, hydrated } = useCart();
  const [finished, setFinished] = useState(false);

  if (finished) {
    return (
      <div
        role="status"
        className="border-border bg-surface shadow-card mx-auto max-w-md rounded-2xl border px-6 py-14 text-center"
      >
        <span className="bg-success-600 mx-auto mb-5 grid size-14 place-items-center rounded-full text-white">
          <Icon name="check" className="size-7" strokeWidth={2.5} />
        </span>
        <p className="text-lg font-black">تم استلام طلبك</p>
        <p className="text-primary-600 mt-2 text-sm">جارٍ فتح تفاصيل الطلب…</p>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]" aria-busy="true" aria-label="جارٍ تحميل بيانات الطلب">
        <div className="space-y-4">
          <div className="border-border bg-surface-muted h-12 animate-pulse rounded-xl border" />
          <div className="border-border bg-surface-muted h-80 animate-pulse rounded-2xl border" />
        </div>
        <div className="border-border bg-surface-muted hidden h-96 animate-pulse rounded-2xl border lg:block" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="cart"
        title="لا توجد منتجات في السلة"
        description="أضف منتجات إلى السلة أولًا حتى تتمكّن من إتمام الطلب."
        action={
          <>
            <ButtonLink href="/shop" size="lg">
              تصفّح المنتجات
            </ButtonLink>
            <ButtonLink href="/track" size="lg" variant="outline">
              تتبّع طلب سابق
            </ButtonLink>
          </>
        }
      />
    );
  }

  return (
    <CheckoutForm
      paymentOptions={paymentOptions}
      pickup={pickup}
      onFinished={() => setFinished(true)}
    />
  );
}
