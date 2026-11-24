import type { Metadata } from "next";

import { PageHeader } from "@/components/site/PageHeader";
import { TrackLookup } from "@/components/track/TrackLookup";
import { normalizeOrderNumber } from "@/lib/shop/phone";

export const metadata: Metadata = {
  title: "تتبّع الطلب",
  description: "اعرف مرحلة طلبك وموعد التسليم المتوقع برقم الطلب والجوال.",
  alternates: { canonical: "/track" },
  robots: { index: false, follow: true },
};

type SearchParams = Promise<{ order?: string }>;

export default async function TrackPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = params.order?.trim().slice(0, 30) ?? "";
  const initialOrder = /^ORD-\d{4}-\d{3,6}$/.test(normalizeOrderNumber(raw))
    ? normalizeOrderNumber(raw)
    : "";

  return (
    <>
      <PageHeader
        compact
        eyebrow="تتبّع الطلب"
        title="أين طلبي؟"
        description="اكتب رقم طلبك وجوالك لتعرف مرحلة التنفيذ وموعد التسليم المتوقع، دون مراسلة."
        breadcrumbs={[{ label: "تتبّع الطلب", href: "/track" }]}
      />

      <div className="bg-surface-muted/60">
        <div className="container-page py-8 md:py-12">
          <TrackLookup initialOrder={initialOrder} />
        </div>
      </div>
    </>
  );
}
