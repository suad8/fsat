import type { Metadata } from "next";
import Link from "next/link";

import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { ShopIcon } from "@/components/shop/ShopIcon";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getSettings } from "@/lib/settings";
import { listPaymentOptions } from "@/lib/shop/payments";

export const metadata: Metadata = {
  title: "إتمام الطلب",
  description: "أكمل بياناتك واختر طريقة الاستلام والدفع لإتمام طلبك كضيف دون تسجيل.",
  alternates: { canonical: "/checkout" },
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const settings = await getSettings();

  return (
    <>
      <div className="border-border bg-surface-muted border-b">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <Breadcrumbs
            items={[
              { label: "السلة", href: "/cart" },
              { label: "إتمام الطلب", href: "/checkout" },
            ]}
          />
          <p className="text-primary-600 flex items-center gap-2 text-xs font-medium">
            <ShopIcon name="lock" className="text-accent-700 size-4" />
            طلب كضيف — بلا تسجيل ولا كلمة مرور
          </p>
        </div>
      </div>

      <div className="bg-surface-muted/60">
        <div className="container-page py-8 md:py-12">
          <h1 className="mb-6 text-2xl font-black md:mb-8 md:text-4xl">إتمام الطلب</h1>
          <CheckoutFlow
            paymentOptions={listPaymentOptions(settings.payment)}
            pickup={{
              city: settings.city,
              addressLine: settings.addressLine,
              workingHours: settings.workingHours,
            }}
          />
          <p className="text-primary-500 mt-10 text-xs">
            عندك سؤال قبل التأكيد؟{" "}
            <Link href="/contact" className="text-accent-800 font-bold underline underline-offset-2">
              تواصل معنا
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
