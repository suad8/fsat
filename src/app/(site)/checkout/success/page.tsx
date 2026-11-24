import type { Metadata } from "next";
import Link from "next/link";

import { SuccessDetails, type PaymentGuide } from "@/components/checkout/SuccessDetails";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PAYMENT_METHODS } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { normalizeOrderNumber } from "@/lib/shop/phone";
import { describePaymentMethod } from "@/lib/shop/payments";

export const metadata: Metadata = {
  title: "تم استلام طلبك",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ order?: string }>;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const settings = await getSettings();

  const raw = params.order?.trim() ?? "";
  const orderNumber = /^ORD-\d{4}-\d{3,6}$/.test(normalizeOrderNumber(raw))
    ? normalizeOrderNumber(raw)
    : null;

  if (!orderNumber) {
    return (
      <div className="container-page py-16 md:py-24">
        <EmptyState
          icon="search"
          title="لم نجد رقم طلب في هذا الرابط"
          description="إن كنت أرسلت طلبًا للتو فستجد رقمه في رسالة التأكيد. يمكنك أيضًا تتبّع طلبك برقمه وجوالك."
          action={
            <>
              <ButtonLink href="/track" size="lg">
                تتبّع طلب
              </ButtonLink>
              <ButtonLink href="/shop" size="lg" variant="outline">
                متابعة التسوّق
              </ButtonLink>
            </>
          }
        />
      </div>
    );
  }

  const guides: Record<string, PaymentGuide> = {};
  for (const method of PAYMENT_METHODS) guides[method] = describePaymentMethod(method);

  return (
    <div className="bg-surface-muted/60">
      <div className="container-page py-12 md:py-20">
        <SuccessDetails
          orderNumber={orderNumber}
          guides={guides}
          bankAccounts={settings.payment.bankAccounts.map((account) => ({
            bankName: account.bankName,
            accountName: account.accountName,
            iban: account.iban,
          }))}
        />

        <p className="text-primary-500 mt-10 text-center text-sm">
          لأي استفسار:{" "}
          <a href={`tel:${settings.phone}`} className="text-accent-800 font-bold" dir="ltr">
            {settings.phoneDisplay}
          </a>{" "}
          أو{" "}
          <Link href="/contact" className="text-accent-800 font-bold">
            صفحة اتصل بنا
          </Link>
        </p>
      </div>
    </div>
  );
}
