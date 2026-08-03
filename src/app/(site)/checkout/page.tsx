import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { PageHeader } from "@/components/site/PageHeader";
import type { PaymentMethod } from "@/lib/constants";
import { getShippingZones } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "إتمام الطلب",
  description: "أكمل بياناتك واختر طريقة الاستلام والدفع لإتمام طلبك.",
  alternates: { canonical: "/checkout" },
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [zones, settings] = await Promise.all([getShippingZones(), getSettings()]);

  // طرق الدفع المفعّلة فقط — لا نعرض خيارًا لا يمكن للعميل إتمامه
  const paymentMethods: PaymentMethod[] = [];
  if (settings.payment.bankTransfer) paymentMethods.push("BANK_TRANSFER");
  if (settings.payment.online) paymentMethods.push("ONLINE");
  if (settings.payment.cod) paymentMethods.push("COD");
  if (settings.payment.onPickup) paymentMethods.push("ON_PICKUP");

  return (
    <>
      <PageHeader
        tone="light"
        eyebrow="الخطوة الأخيرة"
        title="إتمام الطلب"
        description="أكمل بياناتك واختر طريقة الاستلام والدفع. ستصلك رسالة تأكيد برقم طلبك فور الإرسال."
        breadcrumbs={[
          { label: "السلة", href: "/cart" },
          { label: "إتمام الطلب", href: "/checkout" },
        ]}
      />

      <div className="container-page py-10 md:py-14">
        <CheckoutForm
          zones={zones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            cities: Array.isArray(zone.cities) ? (zone.cities as string[]) : [],
            cost: zone.cost,
            freeOverAmount: zone.freeOverAmount,
            estimatedDays: zone.estimatedDays,
          }))}
          paymentMethods={paymentMethods}
          pricesIncludeVat={settings.pricesIncludeVat}
          vatRate={settings.vatRate}
        />
      </div>
    </>
  );
}
