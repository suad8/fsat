import type { Metadata } from "next";

import { CartView } from "@/components/cart/CartView";
import { PageHeader } from "@/components/site/PageHeader";

export const metadata: Metadata = {
  title: "السلة",
  description: "راجع منتجاتك المختارة وكمياتها قبل إتمام الطلب.",
  alternates: { canonical: "/cart" },
  // صفحات السلة والإتمام شخصية ولا قيمة لها في نتائج البحث
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <>
      <PageHeader
        compact
        tone="light"
        eyebrow="السلة"
        title="مراجعة الطلب"
        description="تحقّق من المنتجات والكميات والمواصفات قبل الانتقال لإتمام الطلب."
        breadcrumbs={[{ label: "السلة", href: "/cart" }]}
      />

      <div className="container-page py-10 md:py-14">
        <CartView />
      </div>
    </>
  );
}
